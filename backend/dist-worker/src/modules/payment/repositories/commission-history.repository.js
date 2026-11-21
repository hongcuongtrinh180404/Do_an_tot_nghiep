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
import { CommissionHistoryEntity } from '../schemas/commission-history.schema.js';
let CommissionHistoryRepository = class CommissionHistoryRepository extends BaseMongoRepository {
    constructor(model) {
        super(model, (doc) => {
            const plain = typeof doc.toObject === 'function'
                ? doc.toObject()
                : doc;
            return {
                ...plain,
                id: String(plain._id),
                targetType: plain.targetType === 'SYSTEM' || plain.targetType === 'INSTRUCTOR'
                    ? plain.targetType
                    : plain.instructorId
                        ? 'INSTRUCTOR'
                        : 'SYSTEM',
                instructorId: plain.instructorId ? String(plain.instructorId) : null,
                appliedById: String(plain.appliedById),
            };
        });
    }
    async findByInstructorId(instructorId, session) {
        const docs = await this.model
            .find({
            $or: [
                { instructorId: new Types.ObjectId(instructorId) },
                { targetType: 'SYSTEM' },
            ],
            deletedAt: null,
        })
            .sort({ createdAt: -1 })
            .session(session ?? null)
            .lean()
            .exec();
        return docs.map((d) => this.toDomain(d));
    }
};
CommissionHistoryRepository = __decorate([
    Injectable(),
    __param(0, InjectModel(CommissionHistoryEntity.name)),
    __metadata("design:paramtypes", [Model])
], CommissionHistoryRepository);
export { CommissionHistoryRepository };
//# sourceMappingURL=commission-history.repository.js.map