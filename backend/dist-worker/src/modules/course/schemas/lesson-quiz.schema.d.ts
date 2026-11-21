import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { IQuizOption, QuizQuestionTypeEnum } from 'share-lib';
import { BaseAbstractDocument } from '../../base/index.js';
export type LessonQuizDocument = HydratedDocument<LessonQuizEntity>;
export declare class QuizOptionEntity implements IQuizOption {
    id: string;
    label: string;
    text: string;
    isCorrect: boolean;
}
export declare const QuizOptionSchema: MongooseSchema<QuizOptionEntity, import("mongoose").Model<QuizOptionEntity, any, any, any, any, any, QuizOptionEntity>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, QuizOptionEntity, import("mongoose").Document<unknown, {}, QuizOptionEntity, {}, import("mongoose").DefaultSchemaOptions> & QuizOptionEntity & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, {
    id?: import("mongoose").SchemaDefinitionProperty<string, QuizOptionEntity, import("mongoose").Document<unknown, {}, QuizOptionEntity, {}, import("mongoose").DefaultSchemaOptions> & QuizOptionEntity & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }> | undefined;
    label?: import("mongoose").SchemaDefinitionProperty<string, QuizOptionEntity, import("mongoose").Document<unknown, {}, QuizOptionEntity, {}, import("mongoose").DefaultSchemaOptions> & QuizOptionEntity & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }> | undefined;
    text?: import("mongoose").SchemaDefinitionProperty<string, QuizOptionEntity, import("mongoose").Document<unknown, {}, QuizOptionEntity, {}, import("mongoose").DefaultSchemaOptions> & QuizOptionEntity & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }> | undefined;
    isCorrect?: import("mongoose").SchemaDefinitionProperty<boolean, QuizOptionEntity, import("mongoose").Document<unknown, {}, QuizOptionEntity, {}, import("mongoose").DefaultSchemaOptions> & QuizOptionEntity & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }> | undefined;
}, QuizOptionEntity>;
export declare class LessonQuizEntity extends BaseAbstractDocument {
    id?: string;
    lessonId: string;
    timestamp: number | null;
    explanationTimestamp?: number | null;
    order: number;
    question: string;
    questionType: QuizQuestionTypeEnum;
    options: QuizOptionEntity[];
    explanation?: string | null;
}
export declare const LessonQuizSchema: MongooseSchema<LessonQuizEntity, import("mongoose").Model<LessonQuizEntity, any, any, any, any, any, LessonQuizEntity>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, LessonQuizEntity, import("mongoose").Document<unknown, {}, LessonQuizEntity, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<LessonQuizEntity & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    id?: import("mongoose").SchemaDefinitionProperty<string | undefined, LessonQuizEntity, import("mongoose").Document<unknown, {}, LessonQuizEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonQuizEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    lessonId?: import("mongoose").SchemaDefinitionProperty<string, LessonQuizEntity, import("mongoose").Document<unknown, {}, LessonQuizEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonQuizEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    timestamp?: import("mongoose").SchemaDefinitionProperty<number | null, LessonQuizEntity, import("mongoose").Document<unknown, {}, LessonQuizEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonQuizEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    explanationTimestamp?: import("mongoose").SchemaDefinitionProperty<number | null | undefined, LessonQuizEntity, import("mongoose").Document<unknown, {}, LessonQuizEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonQuizEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    order?: import("mongoose").SchemaDefinitionProperty<number, LessonQuizEntity, import("mongoose").Document<unknown, {}, LessonQuizEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonQuizEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    question?: import("mongoose").SchemaDefinitionProperty<string, LessonQuizEntity, import("mongoose").Document<unknown, {}, LessonQuizEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonQuizEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    questionType?: import("mongoose").SchemaDefinitionProperty<QuizQuestionTypeEnum, LessonQuizEntity, import("mongoose").Document<unknown, {}, LessonQuizEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonQuizEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    options?: import("mongoose").SchemaDefinitionProperty<QuizOptionEntity[], LessonQuizEntity, import("mongoose").Document<unknown, {}, LessonQuizEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonQuizEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    explanation?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, LessonQuizEntity, import("mongoose").Document<unknown, {}, LessonQuizEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonQuizEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    _id?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, LessonQuizEntity, import("mongoose").Document<unknown, {}, LessonQuizEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonQuizEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdAt?: import("mongoose").SchemaDefinitionProperty<Date, LessonQuizEntity, import("mongoose").Document<unknown, {}, LessonQuizEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonQuizEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedAt?: import("mongoose").SchemaDefinitionProperty<Date, LessonQuizEntity, import("mongoose").Document<unknown, {}, LessonQuizEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonQuizEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    deletedAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, LessonQuizEntity, import("mongoose").Document<unknown, {}, LessonQuizEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonQuizEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, LessonQuizEntity, import("mongoose").Document<unknown, {}, LessonQuizEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonQuizEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, LessonQuizEntity, import("mongoose").Document<unknown, {}, LessonQuizEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonQuizEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, LessonQuizEntity>;
