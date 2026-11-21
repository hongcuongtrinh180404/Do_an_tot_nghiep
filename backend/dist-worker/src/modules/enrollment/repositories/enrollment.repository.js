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
import { BaseMongoRepository } from '../../base/index.js';
import { EnrollmentEntity } from '../schemas/enrollment.schema.js';
const COURSE_POPULATE = {
    path: 'courseId',
    populate: [
        {
            path: 'categoryId',
            select: 'name slug imageUrl isActive',
        },
        {
            path: 'instructorId',
            select: 'fullName email avatarUrl username bio',
        },
    ],
};
let EnrollmentRepository = class EnrollmentRepository extends BaseMongoRepository {
    constructor(enrollmentModel) {
        super(enrollmentModel, (doc) => {
            const plain = typeof doc.toObject === 'function'
                ? doc.toObject()
                : doc;
            const rawId = plain._id;
            const id = typeof rawId === 'string' ? rawId : rawId?.toString?.();
            const rawUserId = plain.userId;
            const userId = typeof rawUserId === 'string' ? rawUserId : rawUserId?.toString?.() ?? '';
            const rawCourse = plain.courseId;
            let courseId = '';
            let course = null;
            const isPopulatedCourse = rawCourse !== null &&
                typeof rawCourse === 'object' &&
                'title' in rawCourse;
            if (isPopulatedCourse) {
                const popCourse = rawCourse;
                const popId = popCourse._id;
                courseId = typeof popId === 'string' ? popId : popId?.toString?.() ?? '';
                const rawInstructor = popCourse.instructorId;
                let popInstructorId = '';
                let instructor = null;
                if (rawInstructor !== null &&
                    typeof rawInstructor === 'object' &&
                    'fullName' in rawInstructor) {
                    const popInst = rawInstructor;
                    const popInstId = popInst._id;
                    popInstructorId =
                        typeof popInstId === 'string'
                            ? popInstId
                            : (popInstId?.toString?.() ?? '');
                    instructor = {
                        id: popInstructorId,
                        fullName: popInst.fullName ?? '',
                        email: popInst.email ?? '',
                        avatarUrl: popInst.avatarUrl ?? null,
                        username: popInst.username ?? null,
                        bio: popInst.bio ?? null,
                    };
                }
                else if (rawInstructor !== null && rawInstructor !== undefined) {
                    popInstructorId =
                        typeof rawInstructor === 'string'
                            ? rawInstructor
                            : (rawInstructor.toString?.() ?? '');
                }
                const rawCategory = popCourse.categoryId;
                let popCategoryId = null;
                let category = null;
                if (rawCategory !== null &&
                    typeof rawCategory === 'object' &&
                    'name' in rawCategory) {
                    const popCat = rawCategory;
                    const popCatId = popCat._id;
                    popCategoryId =
                        typeof popCatId === 'string'
                            ? popCatId
                            : (popCatId?.toString?.() ?? null);
                    if (popCategoryId) {
                        category = {
                            id: popCategoryId,
                            name: popCat.name ?? '',
                            slug: popCat.slug ?? '',
                            imageUrl: popCat.imageUrl ?? null,
                        };
                    }
                }
                else if (rawCategory !== null && rawCategory !== undefined) {
                    popCategoryId =
                        typeof rawCategory === 'string'
                            ? rawCategory
                            : (rawCategory.toString?.() ?? null);
                }
                course = {
                    ...popCourse,
                    id: courseId,
                    instructorId: popInstructorId,
                    instructor,
                    categoryId: popCategoryId,
                    category,
                };
            }
            else if (rawCourse !== null && rawCourse !== undefined) {
                courseId = typeof rawCourse === 'string' ? rawCourse : rawCourse.toString?.() ?? '';
            }
            const rawOrderId = plain.orderId;
            const orderId = typeof rawOrderId === 'string' ? rawOrderId : rawOrderId?.toString?.() ?? null;
            return {
                ...plain,
                id: id,
                userId,
                courseId,
                orderId,
                course,
            };
        });
    }
    async findByUserAndCourse(userId, courseId, session) {
        const doc = await this.model
            .findOne({
            userId,
            courseId,
            deletedAt: null,
        })
            .session(session ?? null)
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async ensureIndexes() {
        await this.model.createIndexes();
    }
    async hasRevokedEnrollment(userId, courseId, orderId, session) {
        return Boolean(await this.model.exists({ userId, courseId, orderId, deletedAt: { $ne: null } }).session(session).exec());
    }
    async findUserEnrollments(userId, session) {
        const docs = await this.model
            .find({
            userId,
            deletedAt: null,
        })
            .sort({ enrolledAt: -1 })
            .populate(COURSE_POPULATE)
            .session(session ?? null)
            .exec();
        return docs.map((doc) => this.toDomain(doc));
    }
    async countByCourseId(courseId) {
        return this.model.countDocuments({ courseId, deletedAt: null }).exec();
    }
    async countByCourseIds(courseIds) {
        const map = new Map();
        if (!courseIds || courseIds.length === 0)
            return map;
        const objectIds = courseIds
            .filter((id) => Types.ObjectId.isValid(id))
            .map((id) => new Types.ObjectId(id));
        if (objectIds.length === 0)
            return map;
        const results = await this.model
            .aggregate([
            {
                $match: {
                    courseId: { $in: objectIds },
                    deletedAt: null,
                },
            },
            {
                $group: {
                    _id: '$courseId',
                    count: { $sum: 1 },
                },
            },
        ])
            .exec();
        for (const r of results) {
            map.set(String(r._id), r.count);
        }
        return map;
    }
};
EnrollmentRepository = __decorate([
    Injectable(),
    __param(0, InjectModel(EnrollmentEntity.name)),
    __metadata("design:paramtypes", [Model])
], EnrollmentRepository);
export { EnrollmentRepository };
//# sourceMappingURL=enrollment.repository.js.map