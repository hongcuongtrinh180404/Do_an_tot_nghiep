import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { BaseAbstractDocument } from '../../base/index.js';
export type CourseMindmapDocument = HydratedDocument<CourseMindmapEntity>;
export declare class CourseMindmapEntity extends BaseAbstractDocument {
    courseId: Types.ObjectId;
    mindmapData: Record<string, unknown>;
}
export declare const CourseMindmapSchema: MongooseSchema<CourseMindmapEntity, import("mongoose").Model<CourseMindmapEntity, any, any, any, any, any, CourseMindmapEntity>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, CourseMindmapEntity, import("mongoose").Document<unknown, {}, CourseMindmapEntity, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<CourseMindmapEntity & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    courseId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, CourseMindmapEntity, import("mongoose").Document<unknown, {}, CourseMindmapEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseMindmapEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    mindmapData?: import("mongoose").SchemaDefinitionProperty<Record<string, unknown>, CourseMindmapEntity, import("mongoose").Document<unknown, {}, CourseMindmapEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseMindmapEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    _id?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, CourseMindmapEntity, import("mongoose").Document<unknown, {}, CourseMindmapEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseMindmapEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdAt?: import("mongoose").SchemaDefinitionProperty<Date, CourseMindmapEntity, import("mongoose").Document<unknown, {}, CourseMindmapEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseMindmapEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedAt?: import("mongoose").SchemaDefinitionProperty<Date, CourseMindmapEntity, import("mongoose").Document<unknown, {}, CourseMindmapEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseMindmapEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    deletedAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, CourseMindmapEntity, import("mongoose").Document<unknown, {}, CourseMindmapEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseMindmapEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, CourseMindmapEntity, import("mongoose").Document<unknown, {}, CourseMindmapEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseMindmapEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, CourseMindmapEntity, import("mongoose").Document<unknown, {}, CourseMindmapEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseMindmapEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, CourseMindmapEntity>;
