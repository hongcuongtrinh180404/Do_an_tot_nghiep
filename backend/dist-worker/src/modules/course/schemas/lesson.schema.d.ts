import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { type ILessonContent, ILessonMaterial, LessonContentTypeEnum, LessonTranscriptionStatusEnum } from 'share-lib';
import { BaseAbstractDocument } from '../../base/index.js';
export type LessonDocument = HydratedDocument<LessonEntity>;
export declare class LessonContentEntity implements ILessonContent {
    type: LessonContentTypeEnum;
    url: string;
    publicId?: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    duration?: number;
}
export declare const LessonContentSchema: MongooseSchema<LessonContentEntity, import("mongoose").Model<LessonContentEntity, any, any, any, any, any, LessonContentEntity>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, LessonContentEntity, import("mongoose").Document<unknown, {}, LessonContentEntity, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<LessonContentEntity & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    type?: import("mongoose").SchemaDefinitionProperty<LessonContentTypeEnum, LessonContentEntity, import("mongoose").Document<unknown, {}, LessonContentEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonContentEntity & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    url?: import("mongoose").SchemaDefinitionProperty<string, LessonContentEntity, import("mongoose").Document<unknown, {}, LessonContentEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonContentEntity & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    publicId?: import("mongoose").SchemaDefinitionProperty<string | undefined, LessonContentEntity, import("mongoose").Document<unknown, {}, LessonContentEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonContentEntity & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    fileName?: import("mongoose").SchemaDefinitionProperty<string | undefined, LessonContentEntity, import("mongoose").Document<unknown, {}, LessonContentEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonContentEntity & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    fileSize?: import("mongoose").SchemaDefinitionProperty<number | undefined, LessonContentEntity, import("mongoose").Document<unknown, {}, LessonContentEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonContentEntity & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    mimeType?: import("mongoose").SchemaDefinitionProperty<string | undefined, LessonContentEntity, import("mongoose").Document<unknown, {}, LessonContentEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonContentEntity & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    duration?: import("mongoose").SchemaDefinitionProperty<number | undefined, LessonContentEntity, import("mongoose").Document<unknown, {}, LessonContentEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonContentEntity & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, LessonContentEntity>;
export declare class LessonMaterialEntity implements ILessonMaterial {
    _id: Types.ObjectId;
    id: string;
    title: string;
    url: string;
    fileName: string;
    fileSize?: number;
    mimeType?: string;
    publicId?: string;
    createdAt: Date;
}
export declare const LessonMaterialSchema: MongooseSchema<LessonMaterialEntity, import("mongoose").Model<LessonMaterialEntity, any, any, any, any, any, LessonMaterialEntity>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, LessonMaterialEntity, import("mongoose").Document<unknown, {}, LessonMaterialEntity, {}, import("mongoose").DefaultSchemaOptions> & LessonMaterialEntity & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, {
    _id?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, LessonMaterialEntity, import("mongoose").Document<unknown, {}, LessonMaterialEntity, {}, import("mongoose").DefaultSchemaOptions> & LessonMaterialEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }> | undefined;
    id?: import("mongoose").SchemaDefinitionProperty<string, LessonMaterialEntity, import("mongoose").Document<unknown, {}, LessonMaterialEntity, {}, import("mongoose").DefaultSchemaOptions> & LessonMaterialEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }> | undefined;
    title?: import("mongoose").SchemaDefinitionProperty<string, LessonMaterialEntity, import("mongoose").Document<unknown, {}, LessonMaterialEntity, {}, import("mongoose").DefaultSchemaOptions> & LessonMaterialEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }> | undefined;
    url?: import("mongoose").SchemaDefinitionProperty<string, LessonMaterialEntity, import("mongoose").Document<unknown, {}, LessonMaterialEntity, {}, import("mongoose").DefaultSchemaOptions> & LessonMaterialEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }> | undefined;
    fileName?: import("mongoose").SchemaDefinitionProperty<string, LessonMaterialEntity, import("mongoose").Document<unknown, {}, LessonMaterialEntity, {}, import("mongoose").DefaultSchemaOptions> & LessonMaterialEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }> | undefined;
    fileSize?: import("mongoose").SchemaDefinitionProperty<number | undefined, LessonMaterialEntity, import("mongoose").Document<unknown, {}, LessonMaterialEntity, {}, import("mongoose").DefaultSchemaOptions> & LessonMaterialEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }> | undefined;
    mimeType?: import("mongoose").SchemaDefinitionProperty<string | undefined, LessonMaterialEntity, import("mongoose").Document<unknown, {}, LessonMaterialEntity, {}, import("mongoose").DefaultSchemaOptions> & LessonMaterialEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }> | undefined;
    publicId?: import("mongoose").SchemaDefinitionProperty<string | undefined, LessonMaterialEntity, import("mongoose").Document<unknown, {}, LessonMaterialEntity, {}, import("mongoose").DefaultSchemaOptions> & LessonMaterialEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }> | undefined;
    createdAt?: import("mongoose").SchemaDefinitionProperty<Date, LessonMaterialEntity, import("mongoose").Document<unknown, {}, LessonMaterialEntity, {}, import("mongoose").DefaultSchemaOptions> & LessonMaterialEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }> | undefined;
}, LessonMaterialEntity>;
export declare class LessonEntity extends BaseAbstractDocument {
    sectionId: Types.ObjectId;
    title: string;
    order: number;
    content: ILessonContent;
    materials: LessonMaterialEntity[];
    isPreview: boolean;
    transcriptionStatus: LessonTranscriptionStatusEnum;
}
export declare const LessonSchema: MongooseSchema<LessonEntity, import("mongoose").Model<LessonEntity, any, any, any, any, any, LessonEntity>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, LessonEntity, import("mongoose").Document<unknown, {}, LessonEntity, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<LessonEntity & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    sectionId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, LessonEntity, import("mongoose").Document<unknown, {}, LessonEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    title?: import("mongoose").SchemaDefinitionProperty<string, LessonEntity, import("mongoose").Document<unknown, {}, LessonEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    order?: import("mongoose").SchemaDefinitionProperty<number, LessonEntity, import("mongoose").Document<unknown, {}, LessonEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    content?: import("mongoose").SchemaDefinitionProperty<ILessonContent, LessonEntity, import("mongoose").Document<unknown, {}, LessonEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    materials?: import("mongoose").SchemaDefinitionProperty<LessonMaterialEntity[], LessonEntity, import("mongoose").Document<unknown, {}, LessonEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    isPreview?: import("mongoose").SchemaDefinitionProperty<boolean, LessonEntity, import("mongoose").Document<unknown, {}, LessonEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    transcriptionStatus?: import("mongoose").SchemaDefinitionProperty<LessonTranscriptionStatusEnum, LessonEntity, import("mongoose").Document<unknown, {}, LessonEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    _id?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, LessonEntity, import("mongoose").Document<unknown, {}, LessonEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdAt?: import("mongoose").SchemaDefinitionProperty<Date, LessonEntity, import("mongoose").Document<unknown, {}, LessonEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedAt?: import("mongoose").SchemaDefinitionProperty<Date, LessonEntity, import("mongoose").Document<unknown, {}, LessonEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    deletedAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, LessonEntity, import("mongoose").Document<unknown, {}, LessonEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, LessonEntity, import("mongoose").Document<unknown, {}, LessonEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, LessonEntity, import("mongoose").Document<unknown, {}, LessonEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, LessonEntity>;
