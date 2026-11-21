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
import { CourseApprovalActionEnum, } from 'share-lib';
import { BaseMongoRepository } from '../../base/index.js';
import { CourseApprovalHistoryEntity } from '../schemas/course-approval-history.schema.js';
let CourseApprovalHistoryRepository = class CourseApprovalHistoryRepository extends BaseMongoRepository {
    constructor(model) {
        super(model, (doc) => {
            const plain = typeof doc.toObject === 'function'
                ? doc.toObject()
                : doc;
            const rawId = plain._id;
            const id = typeof rawId === 'string' ? rawId : rawId?.toString?.() ?? '';
            return {
                ...plain,
                id,
                courseId: plain.courseId?.toString?.() ?? String(plain.courseId),
                adminId: plain.adminId?.toString?.() ?? String(plain.adminId),
                instructorId: plain.instructorId?.toString?.() ?? String(plain.instructorId),
            };
        });
    }
    async createHistory(entry, session) {
        const doc = new this.model({
            courseId: new Types.ObjectId(entry.courseId),
            adminId: new Types.ObjectId(entry.adminId),
            instructorId: new Types.ObjectId(entry.instructorId),
            action: entry.action,
            previousStatus: entry.previousStatus,
            targetStatus: entry.targetStatus,
            reason: entry.reason ? entry.reason.trim() : null,
            createdById: new Types.ObjectId(entry.adminId),
            updatedById: new Types.ObjectId(entry.adminId),
        });
        await doc.save({ session });
        return this.toDomain(doc);
    }
    async findAdminHistoriesWithPagination(query, session) {
        const page = Math.max(1, query.page || 1);
        const limit = Math.max(1, Math.min(100, query.limit || 10));
        const skip = (page - 1) * limit;
        const initialMatch = {
            deletedAt: null,
        };
        if (query.action) {
            initialMatch.action = query.action;
        }
        if (query.courseId && Types.ObjectId.isValid(query.courseId)) {
            initialMatch.courseId = new Types.ObjectId(query.courseId);
        }
        const pipeline = [
            { $match: initialMatch },
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
            {
                $lookup: {
                    from: 'course_categories',
                    localField: 'courseDoc.categoryId',
                    foreignField: '_id',
                    as: 'categoryDoc',
                },
            },
            {
                $unwind: {
                    path: '$categoryDoc',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'adminId',
                    foreignField: '_id',
                    as: 'adminDoc',
                },
            },
            {
                $unwind: {
                    path: '$adminDoc',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'instructorId',
                    foreignField: '_id',
                    as: 'instructorDoc',
                },
            },
            {
                $unwind: {
                    path: '$instructorDoc',
                    preserveNullAndEmptyArrays: true,
                },
            },
        ];
        if (query.search?.trim()) {
            const searchRegex = new RegExp(query.search.trim(), 'i');
            pipeline.push({
                $match: {
                    $or: [
                        { 'courseDoc.title': searchRegex },
                        { 'courseDoc.slug': searchRegex },
                        { 'instructorDoc.fullName': searchRegex },
                        { 'instructorDoc.email': searchRegex },
                        { 'adminDoc.fullName': searchRegex },
                        { 'adminDoc.email': searchRegex },
                        { reason: searchRegex },
                    ],
                },
            });
        }
        pipeline.push({
            $facet: {
                total: [{ $count: 'count' }],
                items: [
                    { $sort: { createdAt: -1 } },
                    { $skip: skip },
                    { $limit: limit },
                    {
                        $project: {
                            _id: 1,
                            courseId: 1,
                            adminId: 1,
                            instructorId: 1,
                            action: 1,
                            reason: 1,
                            previousStatus: 1,
                            targetStatus: 1,
                            createdAt: 1,
                            updatedAt: 1,
                            courseDoc: {
                                _id: '$courseDoc._id',
                                title: '$courseDoc.title',
                                slug: '$courseDoc.slug',
                                thumbnailUrl: '$courseDoc.thumbnailUrl',
                                price: '$courseDoc.price',
                                level: '$courseDoc.level',
                                category: {
                                    id: { $toString: '$categoryDoc._id' },
                                    name: '$categoryDoc.name',
                                },
                            },
                            adminDoc: {
                                _id: '$adminDoc._id',
                                fullName: '$adminDoc.fullName',
                                email: '$adminDoc.email',
                                avatarUrl: '$adminDoc.avatarUrl',
                            },
                            instructorDoc: {
                                _id: '$instructorDoc._id',
                                fullName: '$instructorDoc.fullName',
                                email: '$instructorDoc.email',
                                avatarUrl: '$instructorDoc.avatarUrl',
                            },
                        },
                    },
                ],
            },
        });
        const aggregation = this.model.aggregate(pipeline);
        if (session) {
            aggregation.session(session);
        }
        const [result] = await aggregation.exec();
        const total = result?.total?.[0]?.count ?? 0;
        const itemsRaw = result?.items ?? [];
        const items = itemsRaw.map((raw) => ({
            id: raw._id.toString(),
            courseId: raw.courseId.toString(),
            adminId: raw.adminId.toString(),
            instructorId: raw.instructorId.toString(),
            action: raw.action,
            reason: raw.reason ?? null,
            previousStatus: raw.previousStatus,
            targetStatus: raw.targetStatus,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
            course: raw.courseDoc
                ? {
                    id: raw.courseDoc._id.toString(),
                    title: raw.courseDoc.title,
                    slug: raw.courseDoc.slug,
                    thumbnailUrl: raw.courseDoc.thumbnailUrl ?? null,
                    price: raw.courseDoc.price ?? 0,
                    level: raw.courseDoc.level,
                    category: raw.courseDoc.categoryDoc
                        ? {
                            id: raw.courseDoc.categoryDoc._id.toString(),
                            name: raw.courseDoc.categoryDoc.name,
                        }
                        : null,
                }
                : null,
            admin: raw.adminDoc
                ? {
                    id: raw.adminDoc._id.toString(),
                    fullName: raw.adminDoc.fullName,
                    email: raw.adminDoc.email,
                    avatarUrl: raw.adminDoc.avatarUrl ?? null,
                }
                : null,
            instructor: raw.instructorDoc
                ? {
                    id: raw.instructorDoc._id.toString(),
                    fullName: raw.instructorDoc.fullName,
                    email: raw.instructorDoc.email,
                    avatarUrl: raw.instructorDoc.avatarUrl ?? null,
                }
                : null,
        }));
        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1,
        };
    }
    async getStats(session) {
        const pipeline = [
            { $match: { deletedAt: null } },
            {
                $group: {
                    _id: '$action',
                    count: { $sum: 1 },
                },
            },
        ];
        const aggregation = this.model.aggregate(pipeline);
        if (session) {
            aggregation.session(session);
        }
        const rows = await aggregation.exec();
        let approved = 0;
        let rejected = 0;
        for (const row of rows) {
            if (row._id === CourseApprovalActionEnum.APPROVED) {
                approved = row.count;
            }
            else if (row._id === CourseApprovalActionEnum.REJECTED) {
                rejected = row.count;
            }
        }
        return {
            total: approved + rejected,
            approved,
            rejected,
        };
    }
    async findByCourseId(courseId, session) {
        if (!Types.ObjectId.isValid(courseId)) {
            return [];
        }
        const query = this.model
            .find({
            courseId: new Types.ObjectId(courseId),
            deletedAt: null,
        })
            .sort({ createdAt: -1 })
            .populate({
            path: 'adminId',
            select: 'fullName email avatarUrl',
        })
            .populate({
            path: 'instructorId',
            select: 'fullName email avatarUrl',
        });
        if (session) {
            query.session(session);
        }
        const docs = await query.exec();
        return docs.map((doc) => {
            const plain = doc.toObject();
            return {
                id: plain._id.toString(),
                courseId: plain.courseId.toString(),
                adminId: plain.adminId?._id ? plain.adminId._id.toString() : plain.adminId?.toString() ?? '',
                instructorId: plain.instructorId?._id ? plain.instructorId._id.toString() : plain.instructorId?.toString() ?? '',
                action: plain.action,
                reason: plain.reason ?? null,
                previousStatus: plain.previousStatus,
                targetStatus: plain.targetStatus,
                createdAt: plain.createdAt,
                updatedAt: plain.updatedAt,
                admin: plain.adminId?._id
                    ? {
                        id: plain.adminId._id.toString(),
                        fullName: plain.adminId.fullName,
                        email: plain.adminId.email,
                        avatarUrl: plain.adminId.avatarUrl ?? null,
                    }
                    : null,
                instructor: plain.instructorId?._id
                    ? {
                        id: plain.instructorId._id.toString(),
                        fullName: plain.instructorId.fullName,
                        email: plain.instructorId.email,
                        avatarUrl: plain.instructorId.avatarUrl ?? null,
                    }
                    : null,
            };
        });
    }
};
CourseApprovalHistoryRepository = __decorate([
    Injectable(),
    __param(0, InjectModel(CourseApprovalHistoryEntity.name)),
    __metadata("design:paramtypes", [Model])
], CourseApprovalHistoryRepository);
export { CourseApprovalHistoryRepository };
//# sourceMappingURL=course-approval-history.repository.js.map