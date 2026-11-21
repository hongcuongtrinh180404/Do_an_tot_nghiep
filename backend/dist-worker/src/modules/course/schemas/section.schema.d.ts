import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { BaseAbstractDocument } from '../../base/index.js';
export type SectionDocument = HydratedDocument<SectionEntity>;
export declare class SectionEntity extends BaseAbstractDocument {
    courseId: Types.ObjectId;
    title: string;
    description?: string | null;
    order: number;
}
export declare const SectionSchema: MongooseSchema<SectionEntity, import("mongoose").Model<SectionEntity, any, any, any, any, any, SectionEntity>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, SectionEntity, import("mongoose").Document<unknown, {}, SectionEntity, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<SectionEntity & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    courseId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, SectionEntity, import("mongoose").Document<unknown, {}, SectionEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SectionEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    title?: import("mongoose").SchemaDefinitionProperty<string, SectionEntity, import("mongoose").Document<unknown, {}, SectionEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SectionEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    description?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, SectionEntity, import("mongoose").Document<unknown, {}, SectionEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SectionEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    order?: import("mongoose").SchemaDefinitionProperty<number, SectionEntity, import("mongoose").Document<unknown, {}, SectionEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SectionEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    _id?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, SectionEntity, import("mongoose").Document<unknown, {}, SectionEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SectionEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdAt?: import("mongoose").SchemaDefinitionProperty<Date, SectionEntity, import("mongoose").Document<unknown, {}, SectionEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SectionEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedAt?: import("mongoose").SchemaDefinitionProperty<Date, SectionEntity, import("mongoose").Document<unknown, {}, SectionEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SectionEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    deletedAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, SectionEntity, import("mongoose").Document<unknown, {}, SectionEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SectionEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, SectionEntity, import("mongoose").Document<unknown, {}, SectionEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SectionEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, SectionEntity, import("mongoose").Document<unknown, {}, SectionEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SectionEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, SectionEntity>;
