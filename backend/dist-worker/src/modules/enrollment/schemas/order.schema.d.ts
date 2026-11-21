import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { OrderStatusEnum, ReconciliationStatusEnum } from 'share-lib';
import type { IOrderCourseSnapshot, IOrderBankSnapshot } from 'share-lib';
import { BaseAbstractDocument } from '../../base/index.js';
export type OrderDocument = HydratedDocument<OrderEntity>;
export declare class OrderEntity extends BaseAbstractDocument {
    orderCode: string;
    userId: Types.ObjectId;
    courseId: Types.ObjectId;
    instructorId?: Types.ObjectId | null;
    amount: number;
    originalPrice?: number;
    discountAmount?: number;
    paymentMethod?: string;
    expiresAt?: Date;
    paidAt?: Date | null;
    platformCommissionRate?: number;
    platformEarnings?: number;
    instructorCommissionRate?: number;
    instructorEarnings?: number;
    pendingCheckoutKey?: string;
    paymentRevision?: number;
    receivedAmount?: number;
    lastPaymentStatus?: ReconciliationStatusEnum;
    courseSnapshot?: IOrderCourseSnapshot;
    bankSnapshot?: IOrderBankSnapshot;
    status: OrderStatusEnum;
}
export declare const OrderSchema: MongooseSchema<OrderEntity, import("mongoose").Model<OrderEntity, any, any, any, any, any, OrderEntity>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, OrderEntity, import("mongoose").Document<unknown, {}, OrderEntity, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<OrderEntity & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    orderCode?: import("mongoose").SchemaDefinitionProperty<string, OrderEntity, import("mongoose").Document<unknown, {}, OrderEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrderEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    userId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, OrderEntity, import("mongoose").Document<unknown, {}, OrderEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrderEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    courseId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, OrderEntity, import("mongoose").Document<unknown, {}, OrderEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrderEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    instructorId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId | null | undefined, OrderEntity, import("mongoose").Document<unknown, {}, OrderEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrderEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    amount?: import("mongoose").SchemaDefinitionProperty<number, OrderEntity, import("mongoose").Document<unknown, {}, OrderEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrderEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    originalPrice?: import("mongoose").SchemaDefinitionProperty<number | undefined, OrderEntity, import("mongoose").Document<unknown, {}, OrderEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrderEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    discountAmount?: import("mongoose").SchemaDefinitionProperty<number | undefined, OrderEntity, import("mongoose").Document<unknown, {}, OrderEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrderEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    paymentMethod?: import("mongoose").SchemaDefinitionProperty<string | undefined, OrderEntity, import("mongoose").Document<unknown, {}, OrderEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrderEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    expiresAt?: import("mongoose").SchemaDefinitionProperty<Date | undefined, OrderEntity, import("mongoose").Document<unknown, {}, OrderEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrderEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    paidAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, OrderEntity, import("mongoose").Document<unknown, {}, OrderEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrderEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    platformCommissionRate?: import("mongoose").SchemaDefinitionProperty<number | undefined, OrderEntity, import("mongoose").Document<unknown, {}, OrderEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrderEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    platformEarnings?: import("mongoose").SchemaDefinitionProperty<number | undefined, OrderEntity, import("mongoose").Document<unknown, {}, OrderEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrderEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    instructorCommissionRate?: import("mongoose").SchemaDefinitionProperty<number | undefined, OrderEntity, import("mongoose").Document<unknown, {}, OrderEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrderEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    instructorEarnings?: import("mongoose").SchemaDefinitionProperty<number | undefined, OrderEntity, import("mongoose").Document<unknown, {}, OrderEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrderEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    pendingCheckoutKey?: import("mongoose").SchemaDefinitionProperty<string | undefined, OrderEntity, import("mongoose").Document<unknown, {}, OrderEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrderEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    paymentRevision?: import("mongoose").SchemaDefinitionProperty<number | undefined, OrderEntity, import("mongoose").Document<unknown, {}, OrderEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrderEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    receivedAmount?: import("mongoose").SchemaDefinitionProperty<number | undefined, OrderEntity, import("mongoose").Document<unknown, {}, OrderEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrderEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    lastPaymentStatus?: import("mongoose").SchemaDefinitionProperty<ReconciliationStatusEnum | undefined, OrderEntity, import("mongoose").Document<unknown, {}, OrderEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrderEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    courseSnapshot?: import("mongoose").SchemaDefinitionProperty<IOrderCourseSnapshot | undefined, OrderEntity, import("mongoose").Document<unknown, {}, OrderEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrderEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    bankSnapshot?: import("mongoose").SchemaDefinitionProperty<IOrderBankSnapshot | undefined, OrderEntity, import("mongoose").Document<unknown, {}, OrderEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrderEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<OrderStatusEnum, OrderEntity, import("mongoose").Document<unknown, {}, OrderEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrderEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    _id?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, OrderEntity, import("mongoose").Document<unknown, {}, OrderEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrderEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdAt?: import("mongoose").SchemaDefinitionProperty<Date, OrderEntity, import("mongoose").Document<unknown, {}, OrderEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrderEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedAt?: import("mongoose").SchemaDefinitionProperty<Date, OrderEntity, import("mongoose").Document<unknown, {}, OrderEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrderEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    deletedAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, OrderEntity, import("mongoose").Document<unknown, {}, OrderEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrderEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, OrderEntity, import("mongoose").Document<unknown, {}, OrderEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrderEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, OrderEntity, import("mongoose").Document<unknown, {}, OrderEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<OrderEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, OrderEntity>;
