import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { BaseAbstractDocument } from '../../base/index.js';
export type CommissionSettingDocument = HydratedDocument<CommissionSettingEntity>;
export declare class CommissionSettingEntity extends BaseAbstractDocument {
    defaultRate: number;
    isCurrent: boolean;
    appliedById?: Types.ObjectId | null;
}
export declare const CommissionSettingSchema: MongooseSchema<CommissionSettingEntity, import("mongoose").Model<CommissionSettingEntity, any, any, any, any, any, CommissionSettingEntity>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, CommissionSettingEntity, import("mongoose").Document<unknown, {}, CommissionSettingEntity, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<CommissionSettingEntity & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    defaultRate?: import("mongoose").SchemaDefinitionProperty<number, CommissionSettingEntity, import("mongoose").Document<unknown, {}, CommissionSettingEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CommissionSettingEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    isCurrent?: import("mongoose").SchemaDefinitionProperty<boolean, CommissionSettingEntity, import("mongoose").Document<unknown, {}, CommissionSettingEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CommissionSettingEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    appliedById?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId | null | undefined, CommissionSettingEntity, import("mongoose").Document<unknown, {}, CommissionSettingEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CommissionSettingEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    _id?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, CommissionSettingEntity, import("mongoose").Document<unknown, {}, CommissionSettingEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CommissionSettingEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdAt?: import("mongoose").SchemaDefinitionProperty<Date, CommissionSettingEntity, import("mongoose").Document<unknown, {}, CommissionSettingEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CommissionSettingEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedAt?: import("mongoose").SchemaDefinitionProperty<Date, CommissionSettingEntity, import("mongoose").Document<unknown, {}, CommissionSettingEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CommissionSettingEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    deletedAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, CommissionSettingEntity, import("mongoose").Document<unknown, {}, CommissionSettingEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CommissionSettingEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, CommissionSettingEntity, import("mongoose").Document<unknown, {}, CommissionSettingEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CommissionSettingEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, CommissionSettingEntity, import("mongoose").Document<unknown, {}, CommissionSettingEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CommissionSettingEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, CommissionSettingEntity>;
