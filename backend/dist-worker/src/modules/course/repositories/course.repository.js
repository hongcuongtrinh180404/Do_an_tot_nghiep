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
import { CourseStatusEnum, } from 'share-lib';
import { BaseMongoRepository } from '../../base/index.js';
import { CourseEntity } from '../schemas/course.schema.js';
const CATEGORY_POPULATE = {
    path: 'categoryId',
    select: 'name slug imageUrl isActive',
};
const INSTRUCTOR_POPULATE = {
    path: 'instructorId',
    select: 'fullName email avatarUrl username bio',
};
let CourseRepository = class CourseRepository extends BaseMongoRepository {
    constructor(courseModel) {
        super(courseModel, (doc) => {
            const plain = typeof doc.toObject === 'function'
                ? doc.toObject()
                : doc;
            const rawId = plain._id;
            const id = typeof rawId === 'string' ? rawId : rawId?.toString?.();
            const rawInstructor = plain.instructorId;
            let instructorId = '';
            let instructor = null;
            if (rawInstructor !== null &&
                typeof rawInstructor === 'object' &&
                'email' in rawInstructor) {
                const popInst = rawInstructor;
                const popId = popInst._id;
                instructorId =
                    typeof popId === 'string'
                        ? popId
                        : (popId?.toString?.() ?? '');
                instructor = {
                    id: instructorId,
                    fullName: popInst.fullName ?? '',
                    email: popInst.email ?? '',
                    avatarUrl: popInst.avatarUrl ?? null,
                    username: popInst.username ?? null,
                    bio: popInst.bio ?? null,
                };
            }
            else if (rawInstructor !== null && rawInstructor !== undefined) {
                instructorId =
                    typeof rawInstructor === 'string'
                        ? rawInstructor
                        : (rawInstructor.toString?.() ?? '');
            }
            const rawRequesterId = plain.approvalRequestedById;
            const approvalRequestedById = typeof rawRequesterId === 'string'
                ? rawRequesterId
                : rawRequesterId?.toString?.() ?? null;
            const rawReviewedById = plain.reviewedById;
            const reviewedById = typeof rawReviewedById === 'string'
                ? rawReviewedById
                : rawReviewedById?.toString?.() ?? null;
            const rawCategoryId = plain.categoryId;
            let categoryId = null;
            let category = null;
            const isPopulatedCategory = rawCategoryId !== null &&
                typeof rawCategoryId === 'object' &&
                'name' in rawCategoryId;
            if (isPopulatedCategory) {
                const populated = rawCategoryId;
                const populatedId = populated._id;
                categoryId =
                    typeof populatedId === 'string'
                        ? populatedId
                        : (populatedId?.toString?.() ?? null);
                if (categoryId) {
                    category = {
                        id: categoryId,
                        name: populated.name ?? '',
                        slug: populated.slug ?? '',
                        imageUrl: populated.imageUrl ?? null,
                    };
                }
            }
            else if (rawCategoryId !== null && rawCategoryId !== undefined) {
                categoryId =
                    typeof rawCategoryId === 'string'
                        ? rawCategoryId
                        : (rawCategoryId.toString?.() ?? null);
            }
            return {
                ...plain,
                id: id,
                instructorId,
                instructor,
                approvalRequestedById,
                reviewedById,
                categoryId,
                category,
                rejectionReason: plain.rejectionReason ?? null,
                reviewedAt: plain.reviewedAt ?? null,
                ratingAvg: Number(plain.ratingAvg ?? 0),
                reviewCount: Number(plain.reviewCount ?? 0),
            };
        });
    }
    async findById(id, session) {
        const doc = await this.model
            .findOne({ _id: id, deletedAt: null })
            .populate(CATEGORY_POPULATE)
            .populate(INSTRUCTOR_POPULATE)
            .session(session ?? null)
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async updateRatingStats(courseId, ratingAvg, reviewCount, session) {
        await this.model
            .updateOne({ _id: courseId }, {
            $set: {
                ratingAvg,
                reviewCount,
            },
        }, session ? { session } : {})
            .exec();
    }
    async findForEnrollment(id, session) {
        const doc = await this.model.findOne({ _id: id, deletedAt: null })
            .select('price status instructorId').session(session).lean().exec();
        return doc ? this.toDomain(doc) : null;
    }
    async findBySlug(slug, session) {
        const doc = await this.model
            .findOne({
            slug: slug.toLowerCase().trim(),
            deletedAt: null,
        })
            .populate(CATEGORY_POPULATE)
            .populate(INSTRUCTOR_POPULATE)
            .session(session ?? null)
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async requestApproval(course, userId) {
        const doc = await this.model.findOneAndUpdate({
            _id: course.id,
            deletedAt: null,
            status: CourseStatusEnum.DRAFT,
            updatedAt: new Date(course.updatedAt),
        }, {
            $set: {
                status: CourseStatusEnum.PENDING_APPROVAL,
                approvalRequestedAt: new Date(),
                approvalRequestedById: userId,
                updatedById: userId,
                rejectionReason: null,
            },
        }, { new: true, runValidators: true })
            .populate(CATEGORY_POPULATE)
            .populate(INSTRUCTOR_POPULATE)
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async withdrawApproval(courseId, userId, session) {
        const doc = await this.model.findOneAndUpdate({
            _id: courseId,
            deletedAt: null,
            status: CourseStatusEnum.PENDING_APPROVAL,
        }, {
            $set: {
                status: CourseStatusEnum.DRAFT,
                approvalRequestedAt: null,
                approvalRequestedById: null,
                updatedById: userId,
            },
        }, { new: true, runValidators: true })
            .populate(CATEGORY_POPULATE)
            .populate(INSTRUCTOR_POPULATE)
            .session(session ?? null)
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async updateStatus(courseId, fromStatus, toStatus, userId, session) {
        const doc = await this.model.findOneAndUpdate({
            _id: courseId,
            deletedAt: null,
            status: fromStatus,
        }, {
            $set: {
                status: toStatus,
                updatedById: userId,
            },
        }, { new: true, runValidators: true })
            .populate(CATEGORY_POPULATE)
            .populate(INSTRUCTOR_POPULATE)
            .session(session ?? null)
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async approveCourse(courseId, adminId, session) {
        const doc = await this.model.findOneAndUpdate({
            _id: courseId,
            deletedAt: null,
            status: CourseStatusEnum.PENDING_APPROVAL,
        }, {
            $set: {
                status: CourseStatusEnum.PUBLISHED,
                reviewedAt: new Date(),
                reviewedById: adminId,
                updatedById: adminId,
                rejectionReason: null,
            },
        }, { new: true, runValidators: true })
            .populate(CATEGORY_POPULATE)
            .populate(INSTRUCTOR_POPULATE)
            .session(session ?? null)
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async rejectCourse(courseId, adminId, reason, session) {
        const doc = await this.model.findOneAndUpdate({
            _id: courseId,
            deletedAt: null,
            status: CourseStatusEnum.PENDING_APPROVAL,
        }, {
            $set: {
                status: CourseStatusEnum.DRAFT,
                rejectionReason: reason.trim(),
                reviewedAt: new Date(),
                reviewedById: adminId,
                updatedById: adminId,
            },
        }, { new: true, runValidators: true })
            .populate(CATEGORY_POPULATE)
            .populate(INSTRUCTOR_POPULATE)
            .session(session ?? null)
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async getAdminCourseStats(session) {
        const rows = await this.model
            .aggregate([
            { $match: { deletedAt: null } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ])
            .session(session ?? null)
            .exec();
        const counts = new Map(rows.map((row) => [row._id, row.count]));
        return {
            total: rows.reduce((sum, row) => sum + row.count, 0),
            published: counts.get(CourseStatusEnum.PUBLISHED) ?? 0,
            draft: counts.get(CourseStatusEnum.DRAFT) ?? 0,
            archived: counts.get(CourseStatusEnum.ARCHIVED) ?? 0,
            pendingApproval: counts.get(CourseStatusEnum.PENDING_APPROVAL) ?? 0,
        };
    }
    async findAdminCoursesWithPagination(queryDto, session) {
        const filterQuery = {
            deletedAt: null,
        };
        if (queryDto.search) {
            const escaped = queryDto.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            filterQuery.title = { $regex: escaped, $options: 'i' };
        }
        if (queryDto.status) {
            filterQuery.status = queryDto.status;
        }
        if (queryDto.categoryId) {
            filterQuery.categoryId = queryDto.categoryId;
        }
        if (queryDto.instructorId) {
            filterQuery.instructorId = queryDto.instructorId;
        }
        const page = queryDto.page || 1;
        const limit = queryDto.limit || 10;
        const skip = (page - 1) * limit;
        const sortObj = this.buildSortObject(queryDto.sort);
        const [total, docs] = await Promise.all([
            this.model.countDocuments(filterQuery).session(session ?? null).exec(),
            this.model
                .find(filterQuery)
                .sort(sortObj)
                .skip(skip)
                .limit(limit)
                .populate(CATEGORY_POPULATE)
                .populate(INSTRUCTOR_POPULATE)
                .session(session ?? null)
                .exec(),
        ]);
        const totalPages = Math.ceil(total / limit) || 1;
        return {
            items: docs.map((doc) => this.toDomain(doc)),
            total,
            page,
            limit,
            totalPages,
        };
    }
    async findByInstructorId(instructorId, session) {
        const docs = await this.model
            .find({
            instructorId,
            deletedAt: null,
        })
            .sort({ createdAt: -1 })
            .populate(CATEGORY_POPULATE)
            .populate(INSTRUCTOR_POPULATE)
            .session(session ?? null)
            .exec();
        return docs.map((doc) => this.toDomain(doc));
    }
    async countByCategoryId(categoryId) {
        return this.model.countDocuments({ categoryId, deletedAt: null }).exec();
    }
    async countByCategoryIds(options = {}) {
        const match = {
            deletedAt: null,
            categoryId: { $ne: null },
        };
        if (options.onlyPublished) {
            match.status = CourseStatusEnum.PUBLISHED;
        }
        const rows = await this.model
            .aggregate([
            { $match: match },
            { $group: { _id: '$categoryId', count: { $sum: 1 } } },
        ])
            .exec();
        return new Map(rows.map((row) => [String(row._id), Number(row.count)]));
    }
    async findConflictingSlugs(baseSlug, excludeCourseId, session) {
        const escaped = baseSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`^${escaped}(-[0-9]+)?$`, 'i');
        const filter = {
            slug: regex,
            deletedAt: null,
        };
        if (excludeCourseId) {
            filter._id = { $ne: excludeCourseId };
        }
        const docs = await this.model
            .find(filter)
            .select('slug')
            .session(session ?? null)
            .lean()
            .exec();
        return docs.map((d) => d.slug);
    }
    async findPublicCoursesWithPagination(queryDto, categoryId, session) {
        const filterQuery = {
            status: CourseStatusEnum.PUBLISHED,
            deletedAt: null,
        };
        if (queryDto.q) {
            const escaped = queryDto.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            filterQuery.title = { $regex: escaped, $options: 'i' };
        }
        if (categoryId) {
            filterQuery.categoryId = categoryId;
        }
        if (queryDto.instructorId) {
            if (Types.ObjectId.isValid(queryDto.instructorId)) {
                filterQuery.instructorId = new Types.ObjectId(queryDto.instructorId);
            }
            else {
                filterQuery.instructorId = queryDto.instructorId;
            }
        }
        if (queryDto.level) {
            filterQuery.level = queryDto.level;
        }
        if (queryDto.priceRange) {
            switch (queryDto.priceRange) {
                case 'free':
                    filterQuery.price = 0;
                    break;
                case 'under-200':
                    filterQuery.price = { $gt: 0, $lt: 200000 };
                    break;
                case '200-500':
                    filterQuery.price = { $gte: 200000, $lt: 500000 };
                    break;
                case 'above-500':
                    filterQuery.price = { $gte: 500000 };
                    break;
                case 'discount':
                    filterQuery.originalPrice = { $gt: 0 };
                    filterQuery.$expr = { $gt: ['$originalPrice', '$price'] };
                    break;
            }
        }
        const page = queryDto.page || 1;
        const limit = queryDto.limit || 10;
        const skip = (page - 1) * limit;
        let sortObj = { createdAt: -1 };
        if (queryDto.sort === 'price-asc') {
            sortObj = { price: 1, createdAt: -1 };
        }
        else if (queryDto.sort === 'price-desc') {
            sortObj = { price: -1, createdAt: -1 };
        }
        const [total, docs] = await Promise.all([
            this.model.countDocuments(filterQuery).session(session ?? null).exec(),
            this.model
                .find(filterQuery)
                .sort(sortObj)
                .skip(skip)
                .limit(limit)
                .populate(CATEGORY_POPULATE)
                .populate(INSTRUCTOR_POPULATE)
                .session(session ?? null)
                .exec(),
        ]);
        const totalPages = Math.ceil(total / limit) || 1;
        return {
            items: docs.map((doc) => this.toDomain(doc)),
            total,
            page,
            limit,
            totalPages,
        };
    }
    async findPublicCourseDetail(idOrSlug, session, includeUnpublished = false) {
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(idOrSlug);
        const filterQuery = {
            ...(!includeUnpublished ? { status: CourseStatusEnum.PUBLISHED } : {}),
            deletedAt: null,
            ...(isObjectId ? { $or: [{ _id: idOrSlug }, { slug: idOrSlug }] } : { slug: idOrSlug }),
        };
        const doc = await this.model
            .findOne(filterQuery)
            .populate(CATEGORY_POPULATE)
            .populate(INSTRUCTOR_POPULATE)
            .session(session ?? null)
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
};
CourseRepository = __decorate([
    Injectable(),
    __param(0, InjectModel(CourseEntity.name)),
    __metadata("design:paramtypes", [Model])
], CourseRepository);
export { CourseRepository };
//# sourceMappingURL=course.repository.js.map