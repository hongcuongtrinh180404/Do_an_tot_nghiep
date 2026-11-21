import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { CourseApprovalActionEnum, CourseStatusEnum } from 'share-lib';
import { BaseAbstractDocument } from '../../base/index.js';
export type CourseApprovalHistoryDocument = HydratedDocument<CourseApprovalHistoryEntity>;
export declare class CourseApprovalHistoryEntity extends BaseAbstractDocument {
    courseId: Types.ObjectId;
    adminId: Types.ObjectId;
    instructorId: Types.ObjectId;
    action: CourseApprovalActionEnum;
    reason?: string | null;
    previousStatus: CourseStatusEnum;
    targetStatus: CourseStatusEnum;
}
export declare const CourseApprovalHistorySchema: MongooseSchema<CourseApprovalHistoryEntity, import("mongoose").Model<CourseApprovalHistoryEntity, any, any, any, any, any, CourseApprovalHistoryEntity>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, CourseApprovalHistoryEntity, import("mongoose").Document<unknown, {}, CourseApprovalHistoryEntity, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<CourseApprovalHistoryEntity & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    courseId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, CourseApprovalHistoryEntity, import("mongoose").Document<unknown, {}, CourseApprovalHistoryEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseApprovalHistoryEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    adminId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, CourseApprovalHistoryEntity, import("mongoose").Document<unknown, {}, CourseApprovalHistoryEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseApprovalHistoryEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    instructorId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, CourseApprovalHistoryEntity, import("mongoose").Document<unknown, {}, CourseApprovalHistoryEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseApprovalHistoryEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    action?: import("mongoose").SchemaDefinitionProperty<CourseApprovalActionEnum, CourseApprovalHistoryEntity, import("mongoose").Document<unknown, {}, CourseApprovalHistoryEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseApprovalHistoryEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    reason?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, CourseApprovalHistoryEntity, import("mongoose").Document<unknown, {}, CourseApprovalHistoryEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseApprovalHistoryEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    previousStatus?: import("mongoose").SchemaDefinitionProperty<CourseStatusEnum, CourseApprovalHistoryEntity, import("mongoose").Document<unknown, {}, CourseApprovalHistoryEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseApprovalHistoryEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    targetStatus?: import("mongoose").SchemaDefinitionProperty<CourseStatusEnum, CourseApprovalHistoryEntity, import("mongoose").Document<unknown, {}, CourseApprovalHistoryEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseApprovalHistoryEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    _id?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, CourseApprovalHistoryEntity, import("mongoose").Document<unknown, {}, CourseApprovalHistoryEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseApprovalHistoryEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdAt?: import("mongoose").SchemaDefinitionProperty<Date, CourseApprovalHistoryEntity, import("mongoose").Document<unknown, {}, CourseApprovalHistoryEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseApprovalHistoryEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedAt?: import("mongoose").SchemaDefinitionProperty<Date, CourseApprovalHistoryEntity, import("mongoose").Document<unknown, {}, CourseApprovalHistoryEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseApprovalHistoryEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    deletedAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, CourseApprovalHistoryEntity, import("mongoose").Document<unknown, {}, CourseApprovalHistoryEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseApprovalHistoryEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, CourseApprovalHistoryEntity, import("mongoose").Document<unknown, {}, CourseApprovalHistoryEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseApprovalHistoryEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, CourseApprovalHistoryEntity, import("mongoose").Document<unknown, {}, CourseApprovalHistoryEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseApprovalHistoryEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, CourseApprovalHistoryEntity>;
