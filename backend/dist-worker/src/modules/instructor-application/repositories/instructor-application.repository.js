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
import { InstructorApplicationStatusEnum, } from 'share-lib';
import { BaseMongoRepository } from '../../base/index.js';
import { InstructorApplicationEntity, } from '../schemas/instructor-application.schema.js';
import { InstructorApplicationTabEnum, } from '../dto/query-instructor-applications.dto.js';
let InstructorApplicationRepository = class InstructorApplicationRepository extends BaseMongoRepository {
    constructor(applicationModel) {
        super(applicationModel, (doc) => {
            const plain = typeof doc.toObject === 'function'
                ? doc.toObject()
                : doc;
            const rawId = plain._id;
            const id = typeof rawId === 'string'
                ? rawId
                : rawId?.toString?.() ?? '';
            const rawUserId = plain.userId;
            const userId = typeof rawUserId === 'string'
                ? rawUserId
                : rawUserId?.toString?.() ?? '';
            const rawReviewedById = plain.reviewedById;
            const reviewedById = rawReviewedById
                ? typeof rawReviewedById === 'string'
                    ? rawReviewedById
                    : rawReviewedById?.toString?.()
                : null;
            const rawHistory = Array.isArray(plain.history) ? plain.history : [];
            const history = rawHistory.map((h) => {
                const actorId = h.actorId
                    ? typeof h.actorId === 'string'
                        ? h.actorId
                        : h.actorId?.toString?.() ?? ''
                    : '';
                return {
                    action: h.action || 'SUBMITTED',
                    actorId,
                    actorName: h.actorName || '',
                    actorRole: h.actorRole || '',
                    comment: h.comment || null,
                    timestamp: h.timestamp
                        ? new Date(h.timestamp).toISOString()
                        : new Date().toISOString(),
                };
            });
            return {
                id,
                userId,
                applicantName: plain.applicantName || '',
                email: plain.email || '',
                phone: plain.phone || '',
                avatarUrl: plain.avatarUrl || undefined,
                expertises: Array.isArray(plain.expertises) ? plain.expertises : [],
                bio: plain.bio || '',
                experience: plain.experience || '',
                cvFileName: plain.cvFileName || undefined,
                cvFileUrl: plain.cvFileUrl || undefined,
                status: plain.status || InstructorApplicationStatusEnum.PENDING,
                rejectionReason: plain.rejectionReason || null,
                reviewedById: reviewedById || null,
                reviewedByName: plain.reviewedByName || null,
                reviewedAt: plain.reviewedAt ? new Date(plain.reviewedAt).toISOString() : null,
                history,
                createdAt: plain.createdAt ? new Date(plain.createdAt).toISOString() : undefined,
                updatedAt: plain.updatedAt ? new Date(plain.updatedAt).toISOString() : undefined,
            };
        });
    }
    async findApplicationsWithFilter(queryDto, session) {
        const filter = { deletedAt: null };
        if (queryDto.tab === InstructorApplicationTabEnum.PENDING) {
            filter.status = InstructorApplicationStatusEnum.PENDING;
        }
        else if (queryDto.tab === InstructorApplicationTabEnum.HISTORY) {
            if (queryDto.status && queryDto.status !== InstructorApplicationStatusEnum.PENDING) {
                filter.status = queryDto.status;
            }
            else {
                filter.status = {
                    $in: [
                        InstructorApplicationStatusEnum.APPROVED,
                        InstructorApplicationStatusEnum.REJECTED,
                    ],
                };
            }
        }
        else if (queryDto.status) {
            filter.status = queryDto.status;
        }
        if (queryDto.search?.trim()) {
            const searchRegex = new RegExp(queryDto.search.trim(), 'i');
            filter.$or = [
                { applicantName: searchRegex },
                { email: searchRegex },
                { phone: searchRegex },
                { expertises: searchRegex },
                { reviewedByName: searchRegex },
            ];
        }
        const page = Math.max(1, queryDto.page || 1);
        const limit = Math.max(1, Math.min(100, queryDto.limit || 10));
        const skip = (page - 1) * limit;
        const sortObj = this.buildSortObject(queryDto.sort);
        const [items, total] = await Promise.all([
            this.model
                .find(filter)
                .sort(sortObj)
                .skip(skip)
                .limit(limit)
                .session(session ?? null)
                .exec(),
            this.model.countDocuments(filter).session(session ?? null).exec(),
        ]);
        const totalPages = Math.ceil(total / limit) || 1;
        return {
            items: items.map((doc) => this.toDomain(doc)),
            total,
            page,
            limit,
            totalPages,
        };
    }
    async countPending(session) {
        return this.model
            .countDocuments({
            status: InstructorApplicationStatusEnum.PENDING,
            deletedAt: null,
        })
            .session(session ?? null)
            .exec();
    }
    async getStats(session) {
        const [pendingCount, approvedCount, rejectedCount] = await Promise.all([
            this.model
                .countDocuments({ status: InstructorApplicationStatusEnum.PENDING, deletedAt: null })
                .session(session ?? null)
                .exec(),
            this.model
                .countDocuments({ status: InstructorApplicationStatusEnum.APPROVED, deletedAt: null })
                .session(session ?? null)
                .exec(),
            this.model
                .countDocuments({ status: InstructorApplicationStatusEnum.REJECTED, deletedAt: null })
                .session(session ?? null)
                .exec(),
        ]);
        return {
            pendingCount,
            approvedCount,
            rejectedCount,
            totalCount: pendingCount + approvedCount + rejectedCount,
        };
    }
    async findByUserId(userId, session) {
        if (!Types.ObjectId.isValid(userId)) {
            return null;
        }
        const doc = await this.model
            .findOne({ userId: new Types.ObjectId(userId), deletedAt: null })
            .sort({ createdAt: -1 })
            .session(session ?? null)
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async updateStatus(id, status, reviewMeta, historyItem, session) {
        const updateSet = {
            status,
            updatedAt: new Date(),
        };
        if (reviewMeta) {
            if (reviewMeta.reviewedById !== undefined)
                updateSet.reviewedById = reviewMeta.reviewedById;
            if (reviewMeta.reviewedByName !== undefined)
                updateSet.reviewedByName = reviewMeta.reviewedByName;
            if (reviewMeta.rejectionReason !== undefined)
                updateSet.rejectionReason = reviewMeta.rejectionReason;
            if (reviewMeta.reviewedAt !== undefined)
                updateSet.reviewedAt = reviewMeta.reviewedAt;
        }
        const updateOps = {
            $set: updateSet,
        };
        if (historyItem) {
            updateOps.$push = { history: historyItem };
        }
        const doc = await this.model
            .findOneAndUpdate({ _id: new Types.ObjectId(id), deletedAt: null }, updateOps, { new: true, session: session ?? null })
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async createWithHistory(data, historyItem, session) {
        const created = new this.model({
            ...data,
            history: [historyItem],
        });
        const doc = await created.save({ session });
        return this.toDomain(doc);
    }
    async resubmitApplication(id, updateData, historyItem, session) {
        const updateOps = {
            $set: {
                ...updateData,
                status: InstructorApplicationStatusEnum.PENDING,
                rejectionReason: null,
                reviewedById: null,
                reviewedByName: null,
                reviewedAt: null,
                updatedAt: new Date(),
            },
            $push: { history: historyItem },
        };
        const doc = await this.model
            .findOneAndUpdate({ _id: new Types.ObjectId(id), deletedAt: null }, updateOps, { new: true, session: session ?? null })
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async deleteMany(filter, session) {
        const res = await this.model
            .deleteMany(filter, { ...(session ? { session } : {}) })
            .exec();
        return res.deletedCount || 0;
    }
};
InstructorApplicationRepository = __decorate([
    Injectable(),
    __param(0, InjectModel(InstructorApplicationEntity.name)),
    __metadata("design:paramtypes", [Model])
], InstructorApplicationRepository);
export { InstructorApplicationRepository };
//# sourceMappingURL=instructor-application.repository.js.map