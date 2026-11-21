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
import { CommissionSettingEntity } from '../schemas/commission-setting.schema.js';
let CommissionSettingRepository = class CommissionSettingRepository extends BaseMongoRepository {
    constructor(model) {
        super(model, (doc) => {
            const plain = typeof doc.toObject === 'function'
                ? doc.toObject()
                : doc;
            return {
                ...plain,
                id: String(plain._id),
                appliedById: plain.appliedById instanceof Types.ObjectId
                    ? plain.appliedById.toHexString()
                    : typeof plain.appliedById === 'string'
                        ? plain.appliedById
                        : null,
            };
        });
    }
    async getCurrentSetting(session) {
        const doc = await this.model
            .findOne({ isCurrent: true, deletedAt: null })
            .sort({ createdAt: -1 })
            .session(session ?? null)
            .lean()
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async updateDefaultRate(defaultRate, adminId, session) {
        const updateOptions = session ? { session } : {};
        await this.model
            .updateMany({ isCurrent: true }, { $set: { isCurrent: false } }, updateOptions)
            .exec();
        const created = await this.model.create([
            {
                defaultRate,
                isCurrent: true,
                appliedById: new Types.ObjectId(adminId),
                createdById: adminId,
                updatedById: adminId,
            },
        ], updateOptions);
        return this.toDomain(created[0]);
    }
};
CommissionSettingRepository = __decorate([
    Injectable(),
    __param(0, InjectModel(CommissionSettingEntity.name)),
    __metadata("design:paramtypes", [Model])
], CommissionSettingRepository);
export { CommissionSettingRepository };
//# sourceMappingURL=commission-setting.repository.js.map