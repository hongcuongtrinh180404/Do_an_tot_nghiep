import { Schema as MongoSchema, Types } from 'mongoose';
import { BaseAbstractDocument } from '../../base/index.js';
export declare class LessonQuizAnswerEntity extends BaseAbstractDocument {
    userId: Types.ObjectId;
    courseId: Types.ObjectId;
    lessonId: Types.ObjectId;
    quizId: Types.ObjectId;
    quizRevision: string;
    selectedOptionIds: string[];
    isCorrect: boolean;
    correctOptionIds: string[];
    quizSnapshot: Record<string, unknown>;
    submittedAt: Date;
}
export declare const LessonQuizAnswerSchema: MongoSchema<LessonQuizAnswerEntity, import("mongoose").Model<LessonQuizAnswerEntity, any, any, any, any, any, LessonQuizAnswerEntity>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, LessonQuizAnswerEntity, import("mongoose").Document<unknown, {}, LessonQuizAnswerEntity, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<LessonQuizAnswerEntity & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    userId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, LessonQuizAnswerEntity, import("mongoose").Document<unknown, {}, LessonQuizAnswerEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonQuizAnswerEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    courseId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, LessonQuizAnswerEntity, import("mongoose").Document<unknown, {}, LessonQuizAnswerEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonQuizAnswerEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    lessonId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, LessonQuizAnswerEntity, import("mongoose").Document<unknown, {}, LessonQuizAnswerEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonQuizAnswerEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    quizId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, LessonQuizAnswerEntity, import("mongoose").Document<unknown, {}, LessonQuizAnswerEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonQuizAnswerEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    quizRevision?: import("mongoose").SchemaDefinitionProperty<string, LessonQuizAnswerEntity, import("mongoose").Document<unknown, {}, LessonQuizAnswerEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonQuizAnswerEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    selectedOptionIds?: import("mongoose").SchemaDefinitionProperty<string[], LessonQuizAnswerEntity, import("mongoose").Document<unknown, {}, LessonQuizAnswerEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonQuizAnswerEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    isCorrect?: import("mongoose").SchemaDefinitionProperty<boolean, LessonQuizAnswerEntity, import("mongoose").Document<unknown, {}, LessonQuizAnswerEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonQuizAnswerEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    correctOptionIds?: import("mongoose").SchemaDefinitionProperty<string[], LessonQuizAnswerEntity, import("mongoose").Document<unknown, {}, LessonQuizAnswerEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonQuizAnswerEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    quizSnapshot?: import("mongoose").SchemaDefinitionProperty<Record<string, unknown>, LessonQuizAnswerEntity, import("mongoose").Document<unknown, {}, LessonQuizAnswerEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonQuizAnswerEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    submittedAt?: import("mongoose").SchemaDefinitionProperty<Date, LessonQuizAnswerEntity, import("mongoose").Document<unknown, {}, LessonQuizAnswerEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonQuizAnswerEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    _id?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, LessonQuizAnswerEntity, import("mongoose").Document<unknown, {}, LessonQuizAnswerEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonQuizAnswerEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdAt?: import("mongoose").SchemaDefinitionProperty<Date, LessonQuizAnswerEntity, import("mongoose").Document<unknown, {}, LessonQuizAnswerEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonQuizAnswerEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedAt?: import("mongoose").SchemaDefinitionProperty<Date, LessonQuizAnswerEntity, import("mongoose").Document<unknown, {}, LessonQuizAnswerEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonQuizAnswerEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    deletedAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, LessonQuizAnswerEntity, import("mongoose").Document<unknown, {}, LessonQuizAnswerEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonQuizAnswerEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, LessonQuizAnswerEntity, import("mongoose").Document<unknown, {}, LessonQuizAnswerEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonQuizAnswerEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, LessonQuizAnswerEntity, import("mongoose").Document<unknown, {}, LessonQuizAnswerEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonQuizAnswerEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, LessonQuizAnswerEntity>;
export declare class LessonVideoCompletionEntity extends BaseAbstractDocument {
    userId: Types.ObjectId;
    courseId: Types.ObjectId;
    lessonId: Types.ObjectId;
    mediaVersion: string;
    endedAt: Date;
}
export declare const LessonVideoCompletionSchema: MongoSchema<LessonVideoCompletionEntity, import("mongoose").Model<LessonVideoCompletionEntity, any, any, any, any, any, LessonVideoCompletionEntity>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, LessonVideoCompletionEntity, import("mongoose").Document<unknown, {}, LessonVideoCompletionEntity, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<LessonVideoCompletionEntity & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    userId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, LessonVideoCompletionEntity, import("mongoose").Document<unknown, {}, LessonVideoCompletionEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonVideoCompletionEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    courseId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, LessonVideoCompletionEntity, import("mongoose").Document<unknown, {}, LessonVideoCompletionEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonVideoCompletionEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    lessonId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, LessonVideoCompletionEntity, import("mongoose").Document<unknown, {}, LessonVideoCompletionEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonVideoCompletionEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    mediaVersion?: import("mongoose").SchemaDefinitionProperty<string, LessonVideoCompletionEntity, import("mongoose").Document<unknown, {}, LessonVideoCompletionEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonVideoCompletionEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    endedAt?: import("mongoose").SchemaDefinitionProperty<Date, LessonVideoCompletionEntity, import("mongoose").Document<unknown, {}, LessonVideoCompletionEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonVideoCompletionEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    _id?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, LessonVideoCompletionEntity, import("mongoose").Document<unknown, {}, LessonVideoCompletionEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonVideoCompletionEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdAt?: import("mongoose").SchemaDefinitionProperty<Date, LessonVideoCompletionEntity, import("mongoose").Document<unknown, {}, LessonVideoCompletionEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonVideoCompletionEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedAt?: import("mongoose").SchemaDefinitionProperty<Date, LessonVideoCompletionEntity, import("mongoose").Document<unknown, {}, LessonVideoCompletionEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonVideoCompletionEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    deletedAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, LessonVideoCompletionEntity, import("mongoose").Document<unknown, {}, LessonVideoCompletionEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonVideoCompletionEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, LessonVideoCompletionEntity, import("mongoose").Document<unknown, {}, LessonVideoCompletionEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonVideoCompletionEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, LessonVideoCompletionEntity, import("mongoose").Document<unknown, {}, LessonVideoCompletionEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonVideoCompletionEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, LessonVideoCompletionEntity>;
