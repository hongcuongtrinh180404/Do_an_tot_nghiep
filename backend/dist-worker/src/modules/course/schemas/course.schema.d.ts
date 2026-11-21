import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { CourseLevelEnum, CourseStatusEnum } from 'share-lib';
import { BaseAbstractDocument } from '../../base/index.js';
export type CourseDocument = HydratedDocument<CourseEntity>;
export declare class CourseEntity extends BaseAbstractDocument {
    title: string;
    slug: string;
    description?: string | null;
    tags?: string[];
    thumbnailUrl?: string | null;
    trailerUrl?: string | null;
    price: number;
    originalPrice?: number | null;
    instructorId: Types.ObjectId;
    status: CourseStatusEnum;
    approvalRequestedAt?: Date | null;
    approvalRequestedById?: Types.ObjectId | null;
    rejectionReason?: string | null;
    reviewedAt?: Date | null;
    reviewedById?: Types.ObjectId | null;
    level: CourseLevelEnum;
    categoryId?: Types.ObjectId | null;
    ratingAvg?: number;
    reviewCount?: number;
}
export declare const CourseSchema: MongooseSchema<CourseEntity, import("mongoose").Model<CourseEntity, any, any, any, any, any, CourseEntity>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, CourseEntity, import("mongoose").Document<unknown, {}, CourseEntity, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<CourseEntity & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    title?: import("mongoose").SchemaDefinitionProperty<string, CourseEntity, import("mongoose").Document<unknown, {}, CourseEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    slug?: import("mongoose").SchemaDefinitionProperty<string, CourseEntity, import("mongoose").Document<unknown, {}, CourseEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    description?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, CourseEntity, import("mongoose").Document<unknown, {}, CourseEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    tags?: import("mongoose").SchemaDefinitionProperty<string[] | undefined, CourseEntity, import("mongoose").Document<unknown, {}, CourseEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    thumbnailUrl?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, CourseEntity, import("mongoose").Document<unknown, {}, CourseEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    trailerUrl?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, CourseEntity, import("mongoose").Document<unknown, {}, CourseEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    price?: import("mongoose").SchemaDefinitionProperty<number, CourseEntity, import("mongoose").Document<unknown, {}, CourseEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    originalPrice?: import("mongoose").SchemaDefinitionProperty<number | null | undefined, CourseEntity, import("mongoose").Document<unknown, {}, CourseEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    instructorId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, CourseEntity, import("mongoose").Document<unknown, {}, CourseEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<CourseStatusEnum, CourseEntity, import("mongoose").Document<unknown, {}, CourseEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    approvalRequestedAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, CourseEntity, import("mongoose").Document<unknown, {}, CourseEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    approvalRequestedById?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId | null | undefined, CourseEntity, import("mongoose").Document<unknown, {}, CourseEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    rejectionReason?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, CourseEntity, import("mongoose").Document<unknown, {}, CourseEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    reviewedAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, CourseEntity, import("mongoose").Document<unknown, {}, CourseEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    reviewedById?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId | null | undefined, CourseEntity, import("mongoose").Document<unknown, {}, CourseEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    level?: import("mongoose").SchemaDefinitionProperty<CourseLevelEnum, CourseEntity, import("mongoose").Document<unknown, {}, CourseEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    categoryId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId | null | undefined, CourseEntity, import("mongoose").Document<unknown, {}, CourseEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    ratingAvg?: import("mongoose").SchemaDefinitionProperty<number | undefined, CourseEntity, import("mongoose").Document<unknown, {}, CourseEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    reviewCount?: import("mongoose").SchemaDefinitionProperty<number | undefined, CourseEntity, import("mongoose").Document<unknown, {}, CourseEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    _id?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, CourseEntity, import("mongoose").Document<unknown, {}, CourseEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdAt?: import("mongoose").SchemaDefinitionProperty<Date, CourseEntity, import("mongoose").Document<unknown, {}, CourseEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedAt?: import("mongoose").SchemaDefinitionProperty<Date, CourseEntity, import("mongoose").Document<unknown, {}, CourseEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    deletedAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, CourseEntity, import("mongoose").Document<unknown, {}, CourseEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, CourseEntity, import("mongoose").Document<unknown, {}, CourseEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, CourseEntity, import("mongoose").Document<unknown, {}, CourseEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, CourseEntity>;
