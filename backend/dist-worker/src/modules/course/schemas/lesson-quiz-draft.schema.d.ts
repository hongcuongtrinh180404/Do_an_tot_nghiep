import { Schema as MongooseSchema, type HydratedDocument } from 'mongoose';
import type { IGeneratedQuizItem, ILessonQuizDraft } from 'share-lib';
import { BaseAbstractDocument } from '../../base/index.js';
export type LessonQuizDraftDocument = HydratedDocument<LessonQuizDraftEntity>;
export declare class LessonQuizDraftEntity extends BaseAbstractDocument implements ILessonQuizDraft {
    id: string;
    lessonId: string;
    quizzes: IGeneratedQuizItem[];
}
export declare const LessonQuizDraftSchema: MongooseSchema<LessonQuizDraftEntity, import("mongoose").Model<LessonQuizDraftEntity, any, any, any, any, any, LessonQuizDraftEntity>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, LessonQuizDraftEntity, import("mongoose").Document<unknown, {}, LessonQuizDraftEntity, {}, import("mongoose").DefaultSchemaOptions> & LessonQuizDraftEntity & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, {
    id?: import("mongoose").SchemaDefinitionProperty<string, LessonQuizDraftEntity, import("mongoose").Document<unknown, {}, LessonQuizDraftEntity, {}, import("mongoose").DefaultSchemaOptions> & LessonQuizDraftEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }> | undefined;
    lessonId?: import("mongoose").SchemaDefinitionProperty<string, LessonQuizDraftEntity, import("mongoose").Document<unknown, {}, LessonQuizDraftEntity, {}, import("mongoose").DefaultSchemaOptions> & LessonQuizDraftEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }> | undefined;
    quizzes?: import("mongoose").SchemaDefinitionProperty<IGeneratedQuizItem[], LessonQuizDraftEntity, import("mongoose").Document<unknown, {}, LessonQuizDraftEntity, {}, import("mongoose").DefaultSchemaOptions> & LessonQuizDraftEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }> | undefined;
    _id?: import("mongoose").SchemaDefinitionProperty<import("mongoose").Types.ObjectId, LessonQuizDraftEntity, import("mongoose").Document<unknown, {}, LessonQuizDraftEntity, {}, import("mongoose").DefaultSchemaOptions> & LessonQuizDraftEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }> | undefined;
    createdAt?: import("mongoose").SchemaDefinitionProperty<Date, LessonQuizDraftEntity, import("mongoose").Document<unknown, {}, LessonQuizDraftEntity, {}, import("mongoose").DefaultSchemaOptions> & LessonQuizDraftEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }> | undefined;
    updatedAt?: import("mongoose").SchemaDefinitionProperty<Date, LessonQuizDraftEntity, import("mongoose").Document<unknown, {}, LessonQuizDraftEntity, {}, import("mongoose").DefaultSchemaOptions> & LessonQuizDraftEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }> | undefined;
    deletedAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, LessonQuizDraftEntity, import("mongoose").Document<unknown, {}, LessonQuizDraftEntity, {}, import("mongoose").DefaultSchemaOptions> & LessonQuizDraftEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }> | undefined;
    createdById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, LessonQuizDraftEntity, import("mongoose").Document<unknown, {}, LessonQuizDraftEntity, {}, import("mongoose").DefaultSchemaOptions> & LessonQuizDraftEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }> | undefined;
    updatedById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, LessonQuizDraftEntity, import("mongoose").Document<unknown, {}, LessonQuizDraftEntity, {}, import("mongoose").DefaultSchemaOptions> & LessonQuizDraftEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }> | undefined;
}, LessonQuizDraftEntity>;
