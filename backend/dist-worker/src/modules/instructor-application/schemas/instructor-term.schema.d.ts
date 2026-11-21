import { HydratedDocument } from 'mongoose';
import { BaseAbstractDocument } from '../../base/index.js';
export type InstructorTermDocument = HydratedDocument<InstructorTermEntity>;
export declare class InstructorTermEntity extends BaseAbstractDocument {
    title: string;
    content: string;
    isMandatory: boolean;
    order: number;
}
export declare const InstructorTermModelSchema: import("mongoose").Schema<InstructorTermEntity, import("mongoose").Model<InstructorTermEntity, any, any, any, any, any, InstructorTermEntity>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, InstructorTermEntity, import("mongoose").Document<unknown, {}, InstructorTermEntity, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<InstructorTermEntity & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    title?: import("mongoose").SchemaDefinitionProperty<string, InstructorTermEntity, import("mongoose").Document<unknown, {}, InstructorTermEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InstructorTermEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    content?: import("mongoose").SchemaDefinitionProperty<string, InstructorTermEntity, import("mongoose").Document<unknown, {}, InstructorTermEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InstructorTermEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    isMandatory?: import("mongoose").SchemaDefinitionProperty<boolean, InstructorTermEntity, import("mongoose").Document<unknown, {}, InstructorTermEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InstructorTermEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    order?: import("mongoose").SchemaDefinitionProperty<number, InstructorTermEntity, import("mongoose").Document<unknown, {}, InstructorTermEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InstructorTermEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    _id?: import("mongoose").SchemaDefinitionProperty<import("mongoose").Types.ObjectId, InstructorTermEntity, import("mongoose").Document<unknown, {}, InstructorTermEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InstructorTermEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdAt?: import("mongoose").SchemaDefinitionProperty<Date, InstructorTermEntity, import("mongoose").Document<unknown, {}, InstructorTermEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InstructorTermEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedAt?: import("mongoose").SchemaDefinitionProperty<Date, InstructorTermEntity, import("mongoose").Document<unknown, {}, InstructorTermEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InstructorTermEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    deletedAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, InstructorTermEntity, import("mongoose").Document<unknown, {}, InstructorTermEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InstructorTermEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, InstructorTermEntity, import("mongoose").Document<unknown, {}, InstructorTermEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InstructorTermEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, InstructorTermEntity, import("mongoose").Document<unknown, {}, InstructorTermEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InstructorTermEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, InstructorTermEntity>;
