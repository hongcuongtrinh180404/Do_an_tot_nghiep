import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { BaseAbstractDocument } from '../../base/index.js';
export type CommissionHistoryDocument = HydratedDocument<CommissionHistoryEntity>;
export declare class CommissionHistoryEntity extends BaseAbstractDocument {
    targetType: 'SYSTEM' | 'INSTRUCTOR';
    instructorId?: Types.ObjectId | null;
    oldRate: number;
    newRate: number;
    reason: string;
    appliedById: Types.ObjectId;
}
export declare const CommissionHistorySchema: MongooseSchema<CommissionHistoryEntity, import("mongoose").Model<CommissionHistoryEntity, any, any, any, any, any, CommissionHistoryEntity>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, CommissionHistoryEntity, import("mongoose").Document<unknown, {}, CommissionHistoryEntity, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<CommissionHistoryEntity & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    targetType?: import("mongoose").SchemaDefinitionProperty<"INSTRUCTOR" | "SYSTEM", CommissionHistoryEntity, import("mongoose").Document<unknown, {}, CommissionHistoryEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CommissionHistoryEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    instructorId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId | null | undefined, CommissionHistoryEntity, import("mongoose").Document<unknown, {}, CommissionHistoryEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CommissionHistoryEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    oldRate?: import("mongoose").SchemaDefinitionProperty<number, CommissionHistoryEntity, import("mongoose").Document<unknown, {}, CommissionHistoryEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CommissionHistoryEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    newRate?: import("mongoose").SchemaDefinitionProperty<number, CommissionHistoryEntity, import("mongoose").Document<unknown, {}, CommissionHistoryEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CommissionHistoryEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    reason?: import("mongoose").SchemaDefinitionProperty<string, CommissionHistoryEntity, import("mongoose").Document<unknown, {}, CommissionHistoryEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CommissionHistoryEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    appliedById?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, CommissionHistoryEntity, import("mongoose").Document<unknown, {}, CommissionHistoryEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CommissionHistoryEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    _id?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, CommissionHistoryEntity, import("mongoose").Document<unknown, {}, CommissionHistoryEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CommissionHistoryEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdAt?: import("mongoose").SchemaDefinitionProperty<Date, CommissionHistoryEntity, import("mongoose").Document<unknown, {}, CommissionHistoryEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CommissionHistoryEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedAt?: import("mongoose").SchemaDefinitionProperty<Date, CommissionHistoryEntity, import("mongoose").Document<unknown, {}, CommissionHistoryEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CommissionHistoryEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    deletedAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, CommissionHistoryEntity, import("mongoose").Document<unknown, {}, CommissionHistoryEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CommissionHistoryEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, CommissionHistoryEntity, import("mongoose").Document<unknown, {}, CommissionHistoryEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CommissionHistoryEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, CommissionHistoryEntity, import("mongoose").Document<unknown, {}, CommissionHistoryEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CommissionHistoryEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, CommissionHistoryEntity>;
