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
import { SessionEntity } from '../schemas/session.schema.js';
let SessionRepository = class SessionRepository extends BaseMongoRepository {
    constructor(sessionModel) {
        super(sessionModel);
    }
    async findActiveByUserId(userId, session) {
        const doc = await this.model
            .findOne({
            userId: new Types.ObjectId(userId),
            isRevoked: false,
            deletedAt: null,
        })
            .sort({ updatedAt: -1, createdAt: -1 })
            .session(session ?? null)
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async rotateIfCurrent(userId, incomingHash, newHash, newExpiresAt, session) {
        const doc = await this.model
            .findOneAndUpdate({
            userId: new Types.ObjectId(userId),
            refreshTokenHash: incomingHash,
            isRevoked: false,
            deletedAt: null,
        }, {
            $set: {
                previousRefreshTokenHash: incomingHash,
                refreshTokenHash: newHash,
                hashRotatedAt: new Date(),
                expiresAt: newExpiresAt,
            },
        }, { new: true, ...(session ? { session } : {}) })
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async revokeAllByUserId(userId, session) {
        const result = await this.model
            .updateMany({
            userId: new Types.ObjectId(userId),
            isRevoked: false,
        }, {
            $set: { isRevoked: true },
        }, session ? { session } : {})
            .exec();
        return result.modifiedCount > 0;
    }
};
SessionRepository = __decorate([
    Injectable(),
    __param(0, InjectModel(SessionEntity.name)),
    __metadata("design:paramtypes", [Model])
], SessionRepository);
export { SessionRepository };
//# sourceMappingURL=session.repository.js.map