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
import { ReviewStatusEnum, } from 'share-lib';
import { BaseMongoRepository } from '../../base/index.js';
import { ReviewEntity } from '../schemas/review.schema.js';
const USER_POPULATE = {
    path: 'userId',
    select: 'fullName email avatarUrl',
};
const COURSE_POPULATE = {
    path: 'courseId',
    select: 'title slug thumbnail',
};
let ReviewRepository = class ReviewRepository extends BaseMongoRepository {
    constructor(reviewModel) {
        super(reviewModel, (doc) => {
            const plain = typeof doc.toObject === 'function'
                ? doc.toObject()
                : doc;
            const rawId = plain._id;
            const id = typeof rawId === 'string' ? rawId : rawId?.toString?.() ?? '';
            const rawUserId = plain.userId;
            let userId = '';
            let user = null;
            if (rawUserId && typeof rawUserId === 'object' && 'fullName' in rawUserId) {
                const popUser = rawUserId;
                const popId = popUser._id;
                userId = typeof popId === 'string' ? popId : popId?.toString?.() ?? '';
                user = {
                    id: userId,
                    fullName: popUser.fullName ?? '',
                    email: popUser.email ?? '',
                    avatarUrl: popUser.avatarUrl ?? null,
                };
            }
            else if (rawUserId) {
                userId = typeof rawUserId === 'string' ? rawUserId : rawUserId?.toString?.() ?? '';
            }
            const rawCourseId = plain.courseId;
            let courseId = '';
            let course = null;
            if (rawCourseId && typeof rawCourseId === 'object' && 'title' in rawCourseId) {
                const popCourse = rawCourseId;
                const popCId = popCourse._id;
                courseId = typeof popCId === 'string' ? popCId : popCId?.toString?.() ?? '';
                course = {
                    id: courseId,
                    title: popCourse.title ?? '',
                    slug: popCourse.slug,
                    thumbnail: popCourse.thumbnail ?? null,
                };
            }
            else if (rawCourseId) {
                courseId = typeof rawCourseId === 'string' ? rawCourseId : rawCourseId?.toString?.() ?? '';
            }
            const moderationHistory = Array.isArray(plain.moderationHistory)
                ? plain.moderationHistory.map((entry) => ({
                    action: entry.action,
                    adminId: entry.adminId ? entry.adminId.toString() : '',
                    adminName: entry.adminName ?? undefined,
                    reason: entry.reason ?? undefined,
                    createdAt: entry.createdAt || new Date(),
                }))
                : [];
            const reports = Array.isArray(plain.reports)
                ? plain.reports.map((rep) => ({
                    userId: rep.userId ? rep.userId.toString() : '',
                    userName: rep.userName ?? undefined,
                    reason: rep.reason,
                    createdAt: rep.createdAt || new Date(),
                }))
                : [];
            const rawReply = plain.instructorReply;
            let instructorReply = null;
            if (rawReply && typeof rawReply === 'object' && 'content' in rawReply) {
                const reply = rawReply;
                const rawInstructorId = reply.instructorId;
                const replyInstructorId = typeof rawInstructorId === 'string'
                    ? rawInstructorId
                    : rawInstructorId?.toString?.() ?? '';
                instructorReply = {
                    content: reply.content ?? '',
                    instructorId: replyInstructorId,
                    instructorName: reply.instructorName ?? null,
                    repliedAt: reply.repliedAt || new Date(),
                    updatedAt: reply.updatedAt ?? null,
                };
            }
            const rawAdminReply = plain.adminReply;
            let adminReply = null;
            if (rawAdminReply && typeof rawAdminReply === 'object' && 'content' in rawAdminReply) {
                const reply = rawAdminReply;
                adminReply = {
                    content: reply.content ?? '',
                    adminId: reply.adminId?.toString() ?? '',
                    adminName: reply.adminName ?? null,
                    repliedAt: reply.repliedAt || new Date(),
                    updatedAt: reply.updatedAt ?? null,
                    updatedById: reply.updatedById?.toString() ?? null,
                    updatedByName: reply.updatedByName ?? null,
                };
            }
            const status = plain.status || ReviewStatusEnum.VISIBLE;
            return {
                id,
                userId,
                courseId,
                rating: Number(plain.rating),
                comment: plain.comment ?? null,
                status,
                hideReason: plain.hideReason ?? null,
                moderationHistory,
                reports,
                reportCount: Number(plain.reportCount || 0),
                instructorReply,
                adminReply,
                user,
                course,
                createdAt: plain.createdAt || new Date(),
                updatedAt: plain.updatedAt || new Date(),
                deletedAt: plain.deletedAt ?? null,
                createdById: plain.createdById ?? null,
                updatedById: plain.updatedById ?? null,
            };
        });
    }
    async findByUserAndCourse(userId, courseId, session) {
        const doc = await this.model
            .findOne({
            userId: new Types.ObjectId(userId),
            courseId: new Types.ObjectId(courseId),
            deletedAt: null,
        })
            .populate([USER_POPULATE, COURSE_POPULATE])
            .session(session ?? null)
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async findCourseReviews(courseId, page = 1, limit = 10, session) {
        const filterQuery = {
            courseId: new Types.ObjectId(courseId),
            deletedAt: null,
            status: ReviewStatusEnum.VISIBLE,
        };
        const skip = (page - 1) * limit;
        const [total, docs] = await Promise.all([
            this.model.countDocuments(filterQuery).session(session ?? null).exec(),
            this.model
                .find(filterQuery)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate(USER_POPULATE)
                .session(session ?? null)
                .exec(),
        ]);
        const items = docs.map((doc) => this.toDomain(doc));
        const totalPages = Math.ceil(total / limit) || 1;
        return {
            items,
            total,
            page,
            limit,
            totalPages,
        };
    }
    async calculateCourseReviewStats(courseId, session) {
        const matchStage = {
            $match: {
                courseId: new Types.ObjectId(courseId),
                deletedAt: null,
                status: ReviewStatusEnum.VISIBLE,
            },
        };
        const groupStage = {
            $group: {
                _id: '$rating',
                count: { $sum: 1 },
            },
        };
        const aggregation = this.model.aggregate([
            matchStage,
            groupStage,
        ]);
        if (session) {
            aggregation.session(session);
        }
        const ratingCounts = await aggregation.exec();
        const countMap = new Map();
        let totalReviews = 0;
        let totalScore = 0;
        for (const item of ratingCounts) {
            const star = Number(item._id);
            const count = Number(item.count);
            countMap.set(star, count);
            totalReviews += count;
            totalScore += star * count;
        }
        const averageRating = totalReviews > 0 ? Math.round((totalScore / totalReviews) * 10) / 10 : 0;
        const distribution = [5, 4, 3, 2, 1].map((stars) => {
            const count = countMap.get(stars) || 0;
            const percentage = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
            return {
                stars,
                count,
                percentage,
            };
        });
        return {
            averageRating,
            totalReviews,
            distribution,
        };
    }
    async findReviewByIdWithDetails(id, session) {
        if (!Types.ObjectId.isValid(id))
            return null;
        const doc = await this.model
            .findById(new Types.ObjectId(id))
            .populate(USER_POPULATE)
            .populate(COURSE_POPULATE)
            .session(session ?? null)
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async findAdminReviews(dto, session) {
        const page = dto.page || 1;
        const limit = dto.limit || 10;
        const skip = (page - 1) * limit;
        const matchConditions = [];
        if (dto.status === ReviewStatusEnum.DELETED) {
            matchConditions.push({
                $or: [{ status: ReviewStatusEnum.DELETED }, { deletedAt: { $ne: null } }],
            });
        }
        else if (dto.status === ReviewStatusEnum.HIDDEN) {
            matchConditions.push({
                status: ReviewStatusEnum.HIDDEN,
                deletedAt: null,
            });
        }
        else if (dto.status === ReviewStatusEnum.VISIBLE) {
            matchConditions.push({
                status: ReviewStatusEnum.VISIBLE,
                deletedAt: null,
            });
        }
        else if (dto.status === 'reported') {
            matchConditions.push({
                reportCount: { $gt: 0 },
                deletedAt: null,
            });
        }
        else {
            matchConditions.push({ deletedAt: null });
        }
        if (dto.rating) {
            matchConditions.push({ rating: Number(dto.rating) });
        }
        if (dto.courseId && Types.ObjectId.isValid(dto.courseId)) {
            matchConditions.push({ courseId: new Types.ObjectId(dto.courseId) });
        }
        if (dto.hasReports === true) {
            matchConditions.push({ reportCount: { $gt: 0 } });
        }
        if (dto.startDate || dto.endDate) {
            const dateFilter = {};
            if (dto.startDate) {
                dateFilter.$gte = new Date(dto.startDate);
            }
            if (dto.endDate) {
                const end = new Date(dto.endDate);
                end.setHours(23, 59, 59, 999);
                dateFilter.$lte = end;
            }
            matchConditions.push({ createdAt: dateFilter });
        }
        const searchPipeline = [
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'userDoc',
                },
            },
            {
                $unwind: {
                    path: '$userDoc',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: 'courses',
                    localField: 'courseId',
                    foreignField: '_id',
                    as: 'courseDoc',
                },
            },
            {
                $unwind: {
                    path: '$courseDoc',
                    preserveNullAndEmptyArrays: true,
                },
            },
        ];
        if (dto.search && dto.search.trim().length > 0) {
            const escapedSearch = dto.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const searchRegex = new RegExp(escapedSearch, 'i');
            matchConditions.push({
                $or: [
                    { comment: { $regex: searchRegex } },
                    { 'userDoc.fullName': { $regex: searchRegex } },
                    { 'userDoc.email': { $regex: searchRegex } },
                    { 'courseDoc.title': { $regex: searchRegex } },
                ],
            });
        }
        const finalMatch = matchConditions.length > 0 ? { $match: { $and: matchConditions } } : { $match: {} };
        const sortField = dto.sort?.[0]?.orderBy || 'createdAt';
        const sortOrder = dto.sort?.[0]?.order === 'asc' ? 1 : -1;
        const sortStage = { $sort: { [sortField]: sortOrder } };
        const pipeline = [
            ...searchPipeline,
            finalMatch,
            {
                $facet: {
                    metadata: [{ $count: 'total' }],
                    data: [
                        sortStage,
                        { $skip: skip },
                        { $limit: limit },
                        {
                            $project: {
                                _id: 1,
                                userId: {
                                    _id: '$userDoc._id',
                                    fullName: '$userDoc.fullName',
                                    email: '$userDoc.email',
                                    avatarUrl: '$userDoc.avatarUrl',
                                },
                                courseId: {
                                    _id: '$courseDoc._id',
                                    title: '$courseDoc.title',
                                    slug: '$courseDoc.slug',
                                    thumbnail: '$courseDoc.thumbnail',
                                },
                                rating: 1,
                                comment: 1,
                                status: 1,
                                hideReason: 1,
                                moderationHistory: 1,
                                reports: 1,
                                reportCount: 1,
                                instructorReply: 1,
                                adminReply: 1,
                                createdAt: 1,
                                updatedAt: 1,
                                deletedAt: 1,
                                createdById: 1,
                                updatedById: 1,
                            },
                        },
                    ],
                },
            },
        ];
        const aggregation = this.model.aggregate(pipeline);
        if (session) {
            aggregation.session(session);
        }
        const [result] = await aggregation.exec();
        const total = result?.metadata?.[0]?.total || 0;
        const rawItems = result?.data || [];
        const items = rawItems.map((item) => this.toDomain(item));
        const totalPages = Math.ceil(total / limit) || 1;
        return {
            items,
            total,
            page,
            limit,
            totalPages,
        };
    }
    async getAdminStats(session) {
        const pipeline = [
            {
                $facet: {
                    total: [{ $count: 'count' }],
                    visible: [
                        { $match: { status: ReviewStatusEnum.VISIBLE, deletedAt: null } },
                        { $count: 'count' },
                    ],
                    hidden: [
                        { $match: { status: ReviewStatusEnum.HIDDEN, deletedAt: null } },
                        { $count: 'count' },
                    ],
                    reported: [
                        { $match: { reportCount: { $gt: 0 }, deletedAt: null } },
                        { $count: 'count' },
                    ],
                    deleted: [
                        { $match: { $or: [{ status: ReviewStatusEnum.DELETED }, { deletedAt: { $ne: null } }] } },
                        { $count: 'count' },
                    ],
                    visibleStats: [
                        { $match: { status: ReviewStatusEnum.VISIBLE, deletedAt: null } },
                        {
                            $group: {
                                _id: null,
                                avg: { $avg: '$rating' },
                            },
                        },
                    ],
                },
            },
        ];
        const aggregation = this.model.aggregate(pipeline);
        if (session) {
            aggregation.session(session);
        }
        const [res] = await aggregation.exec();
        const total = res?.total?.[0]?.count ?? 0;
        const visibleCount = res?.visible?.[0]?.count ?? 0;
        const hiddenCount = res?.hidden?.[0]?.count ?? 0;
        const reportedCount = res?.reported?.[0]?.count ?? 0;
        const deletedCount = res?.deleted?.[0]?.count ?? 0;
        const rawAvg = res?.visibleStats?.[0]?.avg ?? 0;
        const averageRating = Math.round(rawAvg * 10) / 10;
        return {
            total,
            visibleCount,
            hiddenCount,
            reportedCount,
            deletedCount,
            averageRating,
        };
    }
    async addModerationEntry(reviewId, entry, updateFields, session) {
        const doc = await this.model
            .findByIdAndUpdate(new Types.ObjectId(reviewId), {
            ...updateFields,
            $push: {
                moderationHistory: {
                    action: entry.action,
                    adminId: new Types.ObjectId(entry.adminId),
                    adminName: entry.adminName ?? null,
                    reason: entry.reason ?? null,
                    createdAt: new Date(),
                },
            },
        }, { new: true, session: session ?? null })
            .populate(USER_POPULATE)
            .populate(COURSE_POPULATE)
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async addReportEntry(reviewId, report, session) {
        const doc = await this.model
            .findByIdAndUpdate(new Types.ObjectId(reviewId), {
            $inc: { reportCount: 1 },
            $push: {
                reports: {
                    userId: new Types.ObjectId(report.userId),
                    userName: report.userName ?? null,
                    reason: report.reason,
                    createdAt: new Date(),
                },
            },
        }, { new: true, session: session ?? null })
            .populate(USER_POPULATE)
            .populate(COURSE_POPULATE)
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async dismissReports(reviewId, session) {
        const doc = await this.model
            .findByIdAndUpdate(new Types.ObjectId(reviewId), {
            $set: {
                reports: [],
                reportCount: 0,
            },
        }, { new: true, session: session ?? null })
            .populate(USER_POPULATE)
            .populate(COURSE_POPULATE)
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async setAdminReply(reviewId, reply, session) {
        const doc = await this.model
            .findOneAndUpdate({
            _id: new Types.ObjectId(reviewId),
            deletedAt: null,
            status: ReviewStatusEnum.VISIBLE,
        }, {
            $set: {
                adminReply: {
                    content: reply.content,
                    adminId: new Types.ObjectId(reply.adminId),
                    adminName: reply.adminName ?? null,
                    repliedAt: reply.repliedAt,
                    updatedAt: reply.updatedAt ?? null,
                    updatedById: reply.updatedById ? new Types.ObjectId(reply.updatedById) : null,
                    updatedByName: reply.updatedByName ?? null,
                },
            },
        }, { returnDocument: 'after', runValidators: true, timestamps: false, session: session ?? null })
            .populate(USER_POPULATE)
            .populate(COURSE_POPULATE)
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async setInstructorReply(reviewId, reply, session) {
        const doc = await this.model
            .findOneAndUpdate({
            _id: new Types.ObjectId(reviewId),
            deletedAt: null,
            status: ReviewStatusEnum.VISIBLE,
        }, {
            $set: {
                instructorReply: {
                    content: reply.content,
                    instructorId: new Types.ObjectId(reply.instructorId),
                    instructorName: reply.instructorName ?? null,
                    repliedAt: reply.repliedAt,
                    updatedAt: reply.updatedAt ?? null,
                },
            },
        }, { returnDocument: 'after', runValidators: true, timestamps: false, session: session ?? null })
            .populate(USER_POPULATE)
            .populate(COURSE_POPULATE)
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async clearInstructorReply(reviewId, session) {
        const doc = await this.model
            .findOneAndUpdate({
            _id: new Types.ObjectId(reviewId),
            deletedAt: null,
            status: ReviewStatusEnum.VISIBLE,
            instructorReply: { $ne: null },
        }, { $set: { instructorReply: null } }, { returnDocument: 'after', runValidators: true, timestamps: false, session: session ?? null })
            .populate(USER_POPULATE)
            .populate(COURSE_POPULATE)
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async calculateInstructorReviewStats(instructorId, courseId, session) {
        const instObjectId = new Types.ObjectId(instructorId);
        const courses = await this.model.db
            .collection('courses')
            .find({ instructorId: instObjectId, deletedAt: null }, { projection: { _id: 1 } })
            .toArray();
        const courseIds = courses.map((c) => c._id);
        let matchStage;
        if (courseId && Types.ObjectId.isValid(courseId)) {
            const targetId = new Types.ObjectId(courseId);
            const belongs = courseIds.some((cId) => cId.equals(targetId));
            if (!belongs) {
                return {
                    averageRating: 0,
                    totalReviews: 0,
                    distribution: [5, 4, 3, 2, 1].map((stars) => ({ stars, count: 0, percentage: 0 })),
                };
            }
            matchStage = {
                $match: {
                    courseId: targetId,
                    deletedAt: null,
                    status: ReviewStatusEnum.VISIBLE,
                },
            };
        }
        else {
            matchStage = {
                $match: {
                    courseId: { $in: courseIds },
                    deletedAt: null,
                    status: ReviewStatusEnum.VISIBLE,
                },
            };
        }
        const groupStage = {
            $group: {
                _id: '$rating',
                count: { $sum: 1 },
            },
        };
        const aggregation = this.model.aggregate([
            matchStage,
            groupStage,
        ]);
        if (session) {
            aggregation.session(session);
        }
        const ratingCounts = await aggregation.exec();
        const countMap = new Map();
        let totalReviews = 0;
        let totalScore = 0;
        for (const item of ratingCounts) {
            const star = Number(item._id);
            const count = Number(item.count);
            countMap.set(star, count);
            totalReviews += count;
            totalScore += star * count;
        }
        const averageRating = totalReviews > 0 ? Math.round((totalScore / totalReviews) * 10) / 10 : 0;
        const distribution = [5, 4, 3, 2, 1].map((stars) => {
            const count = countMap.get(stars) || 0;
            const percentage = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
            return {
                stars,
                count,
                percentage,
            };
        });
        return {
            averageRating,
            totalReviews,
            distribution,
        };
    }
    async findInstructorReviews(instructorId, params, session) {
        const page = params.page || 1;
        const limit = params.limit || 10;
        const skip = (page - 1) * limit;
        const instObjectId = new Types.ObjectId(instructorId);
        const courses = await this.model.db
            .collection('courses')
            .find({ instructorId: instObjectId, deletedAt: null }, { projection: { _id: 1 } })
            .toArray();
        const courseIds = courses.map((c) => c._id);
        const filterQuery = {
            deletedAt: null,
            status: ReviewStatusEnum.VISIBLE,
        };
        if (params.courseId && Types.ObjectId.isValid(params.courseId)) {
            const targetId = new Types.ObjectId(params.courseId);
            const belongs = courseIds.some((cId) => cId.equals(targetId));
            if (!belongs) {
                return {
                    items: [],
                    total: 0,
                    page,
                    limit,
                    totalPages: 1,
                };
            }
            filterQuery.courseId = targetId;
        }
        else {
            filterQuery.courseId = { $in: courseIds };
        }
        if (params.rating && [1, 2, 3, 4, 5].includes(Number(params.rating))) {
            filterQuery.rating = Number(params.rating);
        }
        const sortOrder = params.sort === 'created_asc' ? { createdAt: 1 } : { createdAt: -1 };
        const [total, docs] = await Promise.all([
            this.model.countDocuments(filterQuery).session(session ?? null).exec(),
            this.model
                .find(filterQuery)
                .sort(sortOrder)
                .skip(skip)
                .limit(limit)
                .populate(USER_POPULATE)
                .populate(COURSE_POPULATE)
                .session(session ?? null)
                .exec(),
        ]);
        const items = docs.map((doc) => this.toDomain(doc));
        const totalPages = Math.ceil(total / limit) || 1;
        return {
            items,
            total,
            page,
            limit,
            totalPages,
        };
    }
};
ReviewRepository = __decorate([
    Injectable(),
    __param(0, InjectModel(ReviewEntity.name)),
    __metadata("design:paramtypes", [Model])
], ReviewRepository);
export { ReviewRepository };
//# sourceMappingURL=review.repository.js.map