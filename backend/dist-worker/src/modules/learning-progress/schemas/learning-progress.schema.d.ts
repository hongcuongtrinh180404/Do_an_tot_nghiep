import { Schema as MongoSchema, Types } from 'mongoose';
import { BaseAbstractDocument } from '../../base/index.js';
export declare class LearningProgressEntity extends BaseAbstractDocument {
    userId: Types.ObjectId;
    courseId: Types.ObjectId;
    watchedMs: number;
    lastLessonId: Types.ObjectId | null;
    lastMediaUrl: string | null;
    lastPositionSeconds: number;
    sessionId: string | null;
    sessionLessonId: Types.ObjectId | null;
    sessionMediaUrl: string | null;
    sessionExpiresAt: Date | null;
    lastHeartbeatAt: Date | null;
    sessionWatchedMs: number;
    lastSequence: number;
    sessionClosed: boolean;
    revision: number;
}
export declare const LearningProgressSchema: MongoSchema<LearningProgressEntity, import("mongoose").Model<LearningProgressEntity, any, any, any, any, any, LearningProgressEntity>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, LearningProgressEntity, import("mongoose").Document<unknown, {}, LearningProgressEntity, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<LearningProgressEntity & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    userId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, LearningProgressEntity, import("mongoose").Document<unknown, {}, LearningProgressEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LearningProgressEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    courseId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, LearningProgressEntity, import("mongoose").Document<unknown, {}, LearningProgressEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LearningProgressEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    watchedMs?: import("mongoose").SchemaDefinitionProperty<number, LearningProgressEntity, import("mongoose").Document<unknown, {}, LearningProgressEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LearningProgressEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    lastLessonId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId | null, LearningProgressEntity, import("mongoose").Document<unknown, {}, LearningProgressEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LearningProgressEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    lastMediaUrl?: import("mongoose").SchemaDefinitionProperty<string | null, LearningProgressEntity, import("mongoose").Document<unknown, {}, LearningProgressEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LearningProgressEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    lastPositionSeconds?: import("mongoose").SchemaDefinitionProperty<number, LearningProgressEntity, import("mongoose").Document<unknown, {}, LearningProgressEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LearningProgressEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    sessionId?: import("mongoose").SchemaDefinitionProperty<string | null, LearningProgressEntity, import("mongoose").Document<unknown, {}, LearningProgressEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LearningProgressEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    sessionLessonId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId | null, LearningProgressEntity, import("mongoose").Document<unknown, {}, LearningProgressEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LearningProgressEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    sessionMediaUrl?: import("mongoose").SchemaDefinitionProperty<string | null, LearningProgressEntity, import("mongoose").Document<unknown, {}, LearningProgressEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LearningProgressEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    sessionExpiresAt?: import("mongoose").SchemaDefinitionProperty<Date | null, LearningProgressEntity, import("mongoose").Document<unknown, {}, LearningProgressEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LearningProgressEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    lastHeartbeatAt?: import("mongoose").SchemaDefinitionProperty<Date | null, LearningProgressEntity, import("mongoose").Document<unknown, {}, LearningProgressEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LearningProgressEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    sessionWatchedMs?: import("mongoose").SchemaDefinitionProperty<number, LearningProgressEntity, import("mongoose").Document<unknown, {}, LearningProgressEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LearningProgressEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    lastSequence?: import("mongoose").SchemaDefinitionProperty<number, LearningProgressEntity, import("mongoose").Document<unknown, {}, LearningProgressEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LearningProgressEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    sessionClosed?: import("mongoose").SchemaDefinitionProperty<boolean, LearningProgressEntity, import("mongoose").Document<unknown, {}, LearningProgressEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LearningProgressEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    revision?: import("mongoose").SchemaDefinitionProperty<number, LearningProgressEntity, import("mongoose").Document<unknown, {}, LearningProgressEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LearningProgressEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    _id?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, LearningProgressEntity, import("mongoose").Document<unknown, {}, LearningProgressEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LearningProgressEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdAt?: import("mongoose").SchemaDefinitionProperty<Date, LearningProgressEntity, import("mongoose").Document<unknown, {}, LearningProgressEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LearningProgressEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedAt?: import("mongoose").SchemaDefinitionProperty<Date, LearningProgressEntity, import("mongoose").Document<unknown, {}, LearningProgressEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LearningProgressEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    deletedAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, LearningProgressEntity, import("mongoose").Document<unknown, {}, LearningProgressEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LearningProgressEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, LearningProgressEntity, import("mongoose").Document<unknown, {}, LearningProgressEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LearningProgressEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, LearningProgressEntity, import("mongoose").Document<unknown, {}, LearningProgressEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LearningProgressEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, LearningProgressEntity>;
export interface LearningProgressState {
    id: string;
    userId: string;
    courseId: string;
    watchedMs: number;
    lastLessonId: string | null;
    lastMediaUrl: string | null;
    lastPositionSeconds: number;
    sessionId: string | null;
    sessionLessonId: string | null;
    sessionMediaUrl: string | null;
    sessionExpiresAt: Date | null;
    lastHeartbeatAt: Date | null;
    sessionWatchedMs: number;
    lastSequence: number;
    sessionClosed: boolean;
    revision: number;
    updatedAt: Date;
}
