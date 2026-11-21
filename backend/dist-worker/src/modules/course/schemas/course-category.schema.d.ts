import { HydratedDocument } from 'mongoose';
import { BaseAbstractDocument } from '../../base/index.js';
export type CourseCategoryDocument = HydratedDocument<CourseCategoryEntity>;
export declare class CourseCategoryEntity extends BaseAbstractDocument {
    name: string;
    slug: string;
    description?: string | null;
    imageUrl?: string | null;
    order: number;
    isActive: boolean;
}
export declare const CourseCategorySchema: import("mongoose").Schema<CourseCategoryEntity, import("mongoose").Model<CourseCategoryEntity, any, any, any, any, any, CourseCategoryEntity>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, CourseCategoryEntity, import("mongoose").Document<unknown, {}, CourseCategoryEntity, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<CourseCategoryEntity & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    name?: import("mongoose").SchemaDefinitionProperty<string, CourseCategoryEntity, import("mongoose").Document<unknown, {}, CourseCategoryEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseCategoryEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    slug?: import("mongoose").SchemaDefinitionProperty<string, CourseCategoryEntity, import("mongoose").Document<unknown, {}, CourseCategoryEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseCategoryEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    description?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, CourseCategoryEntity, import("mongoose").Document<unknown, {}, CourseCategoryEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseCategoryEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    imageUrl?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, CourseCategoryEntity, import("mongoose").Document<unknown, {}, CourseCategoryEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseCategoryEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    order?: import("mongoose").SchemaDefinitionProperty<number, CourseCategoryEntity, import("mongoose").Document<unknown, {}, CourseCategoryEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseCategoryEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    isActive?: import("mongoose").SchemaDefinitionProperty<boolean, CourseCategoryEntity, import("mongoose").Document<unknown, {}, CourseCategoryEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseCategoryEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    _id?: import("mongoose").SchemaDefinitionProperty<import("mongoose").Types.ObjectId, CourseCategoryEntity, import("mongoose").Document<unknown, {}, CourseCategoryEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseCategoryEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdAt?: import("mongoose").SchemaDefinitionProperty<Date, CourseCategoryEntity, import("mongoose").Document<unknown, {}, CourseCategoryEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseCategoryEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedAt?: import("mongoose").SchemaDefinitionProperty<Date, CourseCategoryEntity, import("mongoose").Document<unknown, {}, CourseCategoryEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseCategoryEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    deletedAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, CourseCategoryEntity, import("mongoose").Document<unknown, {}, CourseCategoryEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseCategoryEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, CourseCategoryEntity, import("mongoose").Document<unknown, {}, CourseCategoryEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseCategoryEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, CourseCategoryEntity, import("mongoose").Document<unknown, {}, CourseCategoryEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CourseCategoryEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, CourseCategoryEntity>;
