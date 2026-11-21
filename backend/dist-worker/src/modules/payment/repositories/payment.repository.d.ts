import { Model, ClientSession } from 'mongoose';
import { IPayment, IPaymentAuditEntry } from 'share-lib';
import { BaseMongoRepository } from '../../base/index.js';
import { PaymentEntity } from '../schemas/payment.schema.js';
export declare class PaymentRepository extends BaseMongoRepository<IPayment, PaymentEntity> {
    constructor(paymentModel: Model<PaymentEntity>);
    ensureIndexes(): Promise<void>;
    runTransaction<R>(operation: (session: ClientSession) => Promise<R>, timeoutMS?: number): Promise<R>;
    findBySepayTransactionId(sepayTransactionId: string, session?: ClientSession): Promise<IPayment | null>;
    findByOrderCode(orderCode: string, session?: ClientSession): Promise<IPayment[]>;
    updateReconciliation(paymentId: string, fields: Partial<IPayment>, session: ClientSession, audit?: IPaymentAuditEntry): Promise<IPayment>;
    getEligibleReceipts(orderId: string, session: ClientSession): Promise<IPayment[]>;
    markReceiptsApplied(paymentIds: string[], appliedAt: Date, session: ClientSession): Promise<void>;
    findReconciliationQueue(page: number, limit: number): Promise<{
        items: IPayment[];
        total: number;
    }>;
}
