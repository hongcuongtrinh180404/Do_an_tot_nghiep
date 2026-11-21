import { Schema as MongooseSchema, type HydratedDocument } from 'mongoose';
import type { ILessonMindmap, ILessonMindmapData } from 'share-lib';
import { BaseAbstractDocument } from '../../base/index.js';
export type LessonMindmapDocument = HydratedDocument<LessonMindmapEntity>;
export declare class LessonMindmapEntity extends BaseAbstractDocument implements ILessonMindmap {
    id: string;
    lessonId: string;
    mindmap: ILessonMindmapData;
    draftMindmap?: ILessonMindmapData | null;
}
export declare const LessonMindmapSchema: MongooseSchema<LessonMindmapEntity, import("mongoose").Model<LessonMindmapEntity, any, any, any, any, any, LessonMindmapEntity>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, LessonMindmapEntity, import("mongoose").Document<unknown, {}, LessonMindmapEntity, {}, import("mongoose").DefaultSchemaOptions> & LessonMindmapEntity & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, {
    id?: import("mongoose").SchemaDefinitionProperty<string, LessonMindmapEntity, import("mongoose").Document<unknown, {}, LessonMindmapEntity, {}, import("mongoose").DefaultSchemaOptions> & LessonMindmapEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }> | undefined;
    lessonId?: import("mongoose").SchemaDefinitionProperty<string, LessonMindmapEntity, import("mongoose").Document<unknown, {}, LessonMindmapEntity, {}, import("mongoose").DefaultSchemaOptions> & LessonMindmapEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }> | undefined;
    mindmap?: import("mongoose").SchemaDefinitionProperty<ILessonMindmapData, LessonMindmapEntity, import("mongoose").Document<unknown, {}, LessonMindmapEntity, {}, import("mongoose").DefaultSchemaOptions> & LessonMindmapEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }> | undefined;
    draftMindmap?: import("mongoose").SchemaDefinitionProperty<ILessonMindmapData | null | undefined, LessonMindmapEntity, import("mongoose").Document<unknown, {}, LessonMindmapEntity, {}, import("mongoose").DefaultSchemaOptions> & LessonMindmapEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }> | undefined;
    _id?: import("mongoose").SchemaDefinitionProperty<import("mongoose").Types.ObjectId, LessonMindmapEntity, import("mongoose").Document<unknown, {}, LessonMindmapEntity, {}, import("mongoose").DefaultSchemaOptions> & LessonMindmapEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }> | undefined;
    createdAt?: import("mongoose").SchemaDefinitionProperty<Date, LessonMindmapEntity, import("mongoose").Document<unknown, {}, LessonMindmapEntity, {}, import("mongoose").DefaultSchemaOptions> & LessonMindmapEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }> | undefined;
    updatedAt?: import("mongoose").SchemaDefinitionProperty<Date, LessonMindmapEntity, import("mongoose").Document<unknown, {}, LessonMindmapEntity, {}, import("mongoose").DefaultSchemaOptions> & LessonMindmapEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }> | undefined;
    deletedAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, LessonMindmapEntity, import("mongoose").Document<unknown, {}, LessonMindmapEntity, {}, import("mongoose").DefaultSchemaOptions> & LessonMindmapEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }> | undefined;
    createdById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, LessonMindmapEntity, import("mongoose").Document<unknown, {}, LessonMindmapEntity, {}, import("mongoose").DefaultSchemaOptions> & LessonMindmapEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }> | undefined;
    updatedById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, LessonMindmapEntity, import("mongoose").Document<unknown, {}, LessonMindmapEntity, {}, import("mongoose").DefaultSchemaOptions> & LessonMindmapEntity & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }> | undefined;
}, LessonMindmapEntity>;
