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
import { ReconciliationStatusEnum } from 'share-lib';
import { BaseMongoRepository } from '../../base/index.js';
import { PaymentEntity } from '../schemas/payment.schema.js';
let PaymentRepository = class PaymentRepository extends BaseMongoRepository {
    constructor(paymentModel) {
        super(paymentModel, (doc) => {
            const plain = typeof doc.toObject === 'function'
                ? doc.toObject()
                : doc;
            return {
                ...plain, id: String(plain._id),
                orderId: plain.orderId instanceof Types.ObjectId ? plain.orderId.toHexString()
                    : typeof plain.orderId === 'string' ? plain.orderId : null,
            };
        });
    }
    async ensureIndexes() {
        await this.model.createIndexes();
    }
    async runTransaction(operation, timeoutMS = 20000) {
        const session = await this.model.db.startSession();
        try {
            return await session.withTransaction(() => operation(session), {
                readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' },
                maxCommitTimeMS: Math.min(10000, timeoutMS), timeoutMS,
            });
        }
        finally {
            await session.endSession();
        }
    }
    async findBySepayTransactionId(sepayTransactionId, session) {
        const doc = await this.model.findOne({ sepayTransactionId }).session(session ?? null).lean().exec();
        return doc ? this.toDomain(doc) : null;
    }
    async findByOrderCode(orderCode, session) {
        const docs = await this.model.find({ orderCode, deletedAt: null }).sort({ createdAt: -1 })
            .session(session ?? null).lean().exec();
        return docs.map((doc) => this.toDomain(doc));
    }
    async updateReconciliation(paymentId, fields, session, audit) {
        const doc = await this.model.findOneAndUpdate({ _id: paymentId, deletedAt: null }, {
            $set: fields, ...(audit ? { $push: { auditHistory: audit } } : {}),
        }, { returnDocument: 'after', session, runValidators: true }).lean().exec();
        if (!doc)
            throw new Error('Payment no longer exists');
        return this.toDomain(doc);
    }
    async getEligibleReceipts(orderId, session) {
        const docs = await this.model.find({
            orderId: new Types.ObjectId(orderId), deletedAt: null,
            reconciliationStatus: { $in: [
                    ReconciliationStatusEnum.UNDERPAID, ReconciliationStatusEnum.MATCHED, ReconciliationStatusEnum.OVERPAID,
                ] },
        }).session(session).lean().exec();
        return docs.map((doc) => this.toDomain(doc));
    }
    async markReceiptsApplied(paymentIds, appliedAt, session) {
        await this.model.updateMany({ _id: { $in: paymentIds }, deletedAt: null }, {
            $set: { appliedAt, reconciliationStatus: ReconciliationStatusEnum.MATCHED },
        }, { session }).exec();
    }
    async findReconciliationQueue(page, limit) {
        const filter = { deletedAt: null, resolution: null, reconciliationStatus: { $ne: ReconciliationStatusEnum.MATCHED } };
        const [docs, total] = await Promise.all([
            this.model.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean().exec(),
            this.model.countDocuments(filter).exec(),
        ]);
        return { items: docs.map((doc) => this.toDomain(doc)), total };
    }
};
PaymentRepository = __decorate([
    Injectable(),
    __param(0, InjectModel(PaymentEntity.name)),
    __metadata("design:paramtypes", [Model])
], PaymentRepository);
export { PaymentRepository };
//# sourceMappingURL=payment.repository.js.map