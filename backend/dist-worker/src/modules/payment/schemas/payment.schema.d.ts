import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { ReconciliationStatusEnum, IPaymentAuditEntry, IPayment } from 'share-lib';
import { BaseAbstractDocument } from '../../base/index.js';
export type PaymentDocument = HydratedDocument<PaymentEntity>;
export declare class PaymentEntity extends BaseAbstractDocument {
    orderId?: Types.ObjectId | null;
    orderCode?: string | null;
    sepayTransactionId: string;
    amountIn: number;
    bankBrandName: string;
    accountNumber: string;
    transactionDate: Date | null;
    content: string;
    reconciliationStatus: ReconciliationStatusEnum;
    rawPayload?: Record<string, unknown>;
    appliedAt?: Date | null;
    verifiedAt?: Date;
    payloadHash?: string;
    excessAmount?: number;
    resolution?: IPayment['resolution'];
    auditHistory?: IPaymentAuditEntry[];
}
export declare const PaymentSchema: MongooseSchema<PaymentEntity, import("mongoose").Model<PaymentEntity, any, any, any, any, any, PaymentEntity>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PaymentEntity, import("mongoose").Document<unknown, {}, PaymentEntity, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<PaymentEntity & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    orderId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId | null | undefined, PaymentEntity, import("mongoose").Document<unknown, {}, PaymentEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PaymentEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    orderCode?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, PaymentEntity, import("mongoose").Document<unknown, {}, PaymentEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PaymentEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    sepayTransactionId?: import("mongoose").SchemaDefinitionProperty<string, PaymentEntity, import("mongoose").Document<unknown, {}, PaymentEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PaymentEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    amountIn?: import("mongoose").SchemaDefinitionProperty<number, PaymentEntity, import("mongoose").Document<unknown, {}, PaymentEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PaymentEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    bankBrandName?: import("mongoose").SchemaDefinitionProperty<string, PaymentEntity, import("mongoose").Document<unknown, {}, PaymentEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PaymentEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    accountNumber?: import("mongoose").SchemaDefinitionProperty<string, PaymentEntity, import("mongoose").Document<unknown, {}, PaymentEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PaymentEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    transactionDate?: import("mongoose").SchemaDefinitionProperty<Date | null, PaymentEntity, import("mongoose").Document<unknown, {}, PaymentEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PaymentEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    content?: import("mongoose").SchemaDefinitionProperty<string, PaymentEntity, import("mongoose").Document<unknown, {}, PaymentEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PaymentEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    reconciliationStatus?: import("mongoose").SchemaDefinitionProperty<ReconciliationStatusEnum, PaymentEntity, import("mongoose").Document<unknown, {}, PaymentEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PaymentEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    rawPayload?: import("mongoose").SchemaDefinitionProperty<Record<string, unknown> | undefined, PaymentEntity, import("mongoose").Document<unknown, {}, PaymentEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PaymentEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    appliedAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, PaymentEntity, import("mongoose").Document<unknown, {}, PaymentEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PaymentEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    verifiedAt?: import("mongoose").SchemaDefinitionProperty<Date | undefined, PaymentEntity, import("mongoose").Document<unknown, {}, PaymentEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PaymentEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    payloadHash?: import("mongoose").SchemaDefinitionProperty<string | undefined, PaymentEntity, import("mongoose").Document<unknown, {}, PaymentEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PaymentEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    excessAmount?: import("mongoose").SchemaDefinitionProperty<number | undefined, PaymentEntity, import("mongoose").Document<unknown, {}, PaymentEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PaymentEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    resolution?: import("mongoose").SchemaDefinitionProperty<{
        type: "ACKNOWLEDGED" | "REFUNDED";
        note: string;
        bankReference?: string;
        refundedAmount?: number;
        actorId: string;
        at: Date | string;
    } | null | undefined, PaymentEntity, import("mongoose").Document<unknown, {}, PaymentEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PaymentEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    auditHistory?: import("mongoose").SchemaDefinitionProperty<IPaymentAuditEntry[] | undefined, PaymentEntity, import("mongoose").Document<unknown, {}, PaymentEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PaymentEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    _id?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, PaymentEntity, import("mongoose").Document<unknown, {}, PaymentEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PaymentEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdAt?: import("mongoose").SchemaDefinitionProperty<Date, PaymentEntity, import("mongoose").Document<unknown, {}, PaymentEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PaymentEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedAt?: import("mongoose").SchemaDefinitionProperty<Date, PaymentEntity, import("mongoose").Document<unknown, {}, PaymentEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PaymentEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    deletedAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, PaymentEntity, import("mongoose").Document<unknown, {}, PaymentEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PaymentEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, PaymentEntity, import("mongoose").Document<unknown, {}, PaymentEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PaymentEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, PaymentEntity, import("mongoose").Document<unknown, {}, PaymentEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PaymentEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, PaymentEntity>;
