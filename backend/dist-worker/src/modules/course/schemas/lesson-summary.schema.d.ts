import { Schema as MongooseSchema, type HydratedDocument } from 'mongoose';
import type { ILessonSummary, ILessonSummaryData } from 'share-lib';
import { BaseAbstractDocument } from '../../base/index.js';
export type LessonSummaryDocument = HydratedDocument<LessonSummaryEntity>;
export declare class LessonSummaryEntity extends BaseAbstractDocument implements ILessonSummary {
    id: string;
    lessonId: string;
    summary: ILessonSummaryData;
    draftSummary?: ILessonSummaryData | null;
}
export declare const LessonSummarySchema: MongooseSchema<LessonSummaryEntity, import("mongoose").Model<LessonSummaryEntity, any, any, any, any, any, LessonSummaryEntity>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, LessonSummaryEntity, import("mongoose").Document<unknown, {}, LessonSummaryEntity, {}, import("mongoose").DefaultSchemaOptions> & LessonSummaryEntity & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, {
    id?: import("mongoose").SchemaDefinitionProperty<string, LessonSummaryEntity, import("mongoose").Document<unknown, {}, LessonSummaryEntity, {}, import("mongoose").DefaultSchemaOptions> & LessonSummaryEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }> | undefined;
    lessonId?: import("mongoose").SchemaDefinitionProperty<string, LessonSummaryEntity, import("mongoose").Document<unknown, {}, LessonSummaryEntity, {}, import("mongoose").DefaultSchemaOptions> & LessonSummaryEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }> | undefined;
    summary?: import("mongoose").SchemaDefinitionProperty<ILessonSummaryData, LessonSummaryEntity, import("mongoose").Document<unknown, {}, LessonSummaryEntity, {}, import("mongoose").DefaultSchemaOptions> & LessonSummaryEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }> | undefined;
    draftSummary?: import("mongoose").SchemaDefinitionProperty<ILessonSummaryData | null | undefined, LessonSummaryEntity, import("mongoose").Document<unknown, {}, LessonSummaryEntity, {}, import("mongoose").DefaultSchemaOptions> & LessonSummaryEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }> | undefined;
    _id?: import("mongoose").SchemaDefinitionProperty<import("mongoose").Types.ObjectId, LessonSummaryEntity, import("mongoose").Document<unknown, {}, LessonSummaryEntity, {}, import("mongoose").DefaultSchemaOptions> & LessonSummaryEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }> | undefined;
    createdAt?: import("mongoose").SchemaDefinitionProperty<Date, LessonSummaryEntity, import("mongoose").Document<unknown, {}, LessonSummaryEntity, {}, import("mongoose").DefaultSchemaOptions> & LessonSummaryEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }> | undefined;
    updatedAt?: import("mongoose").SchemaDefinitionProperty<Date, LessonSummaryEntity, import("mongoose").Document<unknown, {}, LessonSummaryEntity, {}, import("mongoose").DefaultSchemaOptions> & LessonSummaryEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }> | undefined;
    deletedAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, LessonSummaryEntity, import("mongoose").Document<unknown, {}, LessonSummaryEntity, {}, import("mongoose").DefaultSchemaOptions> & LessonSummaryEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }> | undefined;
    createdById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, LessonSummaryEntity, import("mongoose").Document<unknown, {}, LessonSummaryEntity, {}, import("mongoose").DefaultSchemaOptions> & LessonSummaryEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }> | undefined;
    updatedById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, LessonSummaryEntity, import("mongoose").Document<unknown, {}, LessonSummaryEntity, {}, import("mongoose").DefaultSchemaOptions> & LessonSummaryEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }> | undefined;
}, LessonSummaryEntity>;
