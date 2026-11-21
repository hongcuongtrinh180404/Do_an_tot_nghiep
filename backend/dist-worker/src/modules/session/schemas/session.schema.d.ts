import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { BaseAbstractDocument } from '../../base/index.js';
export type SessionDocument = HydratedDocument<SessionEntity>;
export declare class SessionEntity extends BaseAbstractDocument {
    userId: Types.ObjectId;
    refreshTokenHash: string;
    previousRefreshTokenHash?: string | null;
    hashRotatedAt?: Date | null;
    expiresAt: Date;
    isRevoked: boolean;
}
export declare const SessionSchema: MongooseSchema<SessionEntity, import("mongoose").Model<SessionEntity, any, any, any, any, any, SessionEntity>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, SessionEntity, import("mongoose").Document<unknown, {}, SessionEntity, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<SessionEntity & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    userId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, SessionEntity, import("mongoose").Document<unknown, {}, SessionEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SessionEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    refreshTokenHash?: import("mongoose").SchemaDefinitionProperty<string, SessionEntity, import("mongoose").Document<unknown, {}, SessionEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SessionEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    previousRefreshTokenHash?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, SessionEntity, import("mongoose").Document<unknown, {}, SessionEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SessionEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    hashRotatedAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, SessionEntity, import("mongoose").Document<unknown, {}, SessionEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SessionEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    expiresAt?: import("mongoose").SchemaDefinitionProperty<Date, SessionEntity, import("mongoose").Document<unknown, {}, SessionEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SessionEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    isRevoked?: import("mongoose").SchemaDefinitionProperty<boolean, SessionEntity, import("mongoose").Document<unknown, {}, SessionEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SessionEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    _id?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, SessionEntity, import("mongoose").Document<unknown, {}, SessionEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SessionEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdAt?: import("mongoose").SchemaDefinitionProperty<Date, SessionEntity, import("mongoose").Document<unknown, {}, SessionEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SessionEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedAt?: import("mongoose").SchemaDefinitionProperty<Date, SessionEntity, import("mongoose").Document<unknown, {}, SessionEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SessionEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    deletedAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, SessionEntity, import("mongoose").Document<unknown, {}, SessionEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SessionEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, SessionEntity, import("mongoose").Document<unknown, {}, SessionEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SessionEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, SessionEntity, import("mongoose").Document<unknown, {}, SessionEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<SessionEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, SessionEntity>;
