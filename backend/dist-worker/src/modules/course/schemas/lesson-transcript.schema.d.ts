import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { ITranscribedSentence, LessonTranscriptionStatusEnum } from 'share-lib';
import { BaseAbstractDocument } from '../../base/index.js';
export type LessonTranscriptDocument = HydratedDocument<LessonTranscriptEntity>;
export declare class TranscribedSentenceEntity implements ITranscribedSentence {
    text: string;
    start: number;
    end: number;
}
export declare const TranscribedSentenceSchema: MongooseSchema<TranscribedSentenceEntity, import("mongoose").Model<TranscribedSentenceEntity, any, any, any, any, any, TranscribedSentenceEntity>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, TranscribedSentenceEntity, import("mongoose").Document<unknown, {}, TranscribedSentenceEntity, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<TranscribedSentenceEntity & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    text?: import("mongoose").SchemaDefinitionProperty<string, TranscribedSentenceEntity, import("mongoose").Document<unknown, {}, TranscribedSentenceEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<TranscribedSentenceEntity & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    start?: import("mongoose").SchemaDefinitionProperty<number, TranscribedSentenceEntity, import("mongoose").Document<unknown, {}, TranscribedSentenceEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<TranscribedSentenceEntity & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    end?: import("mongoose").SchemaDefinitionProperty<number, TranscribedSentenceEntity, import("mongoose").Document<unknown, {}, TranscribedSentenceEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<TranscribedSentenceEntity & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, TranscribedSentenceEntity>;
export declare class LessonTranscriptEntity extends BaseAbstractDocument {
    lessonId: Types.ObjectId;
    rawTranscript: string;
    sentences: TranscribedSentenceEntity[];
    durationSeconds: number;
    languageCode: string;
    externalTranscriptId?: string | null;
    status: LessonTranscriptionStatusEnum;
    failureReason?: string | null;
}
export declare const LessonTranscriptSchema: MongooseSchema<LessonTranscriptEntity, import("mongoose").Model<LessonTranscriptEntity, any, any, any, any, any, LessonTranscriptEntity>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, LessonTranscriptEntity, import("mongoose").Document<unknown, {}, LessonTranscriptEntity, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<LessonTranscriptEntity & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    lessonId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, LessonTranscriptEntity, import("mongoose").Document<unknown, {}, LessonTranscriptEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonTranscriptEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    rawTranscript?: import("mongoose").SchemaDefinitionProperty<string, LessonTranscriptEntity, import("mongoose").Document<unknown, {}, LessonTranscriptEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonTranscriptEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    sentences?: import("mongoose").SchemaDefinitionProperty<TranscribedSentenceEntity[], LessonTranscriptEntity, import("mongoose").Document<unknown, {}, LessonTranscriptEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonTranscriptEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    durationSeconds?: import("mongoose").SchemaDefinitionProperty<number, LessonTranscriptEntity, import("mongoose").Document<unknown, {}, LessonTranscriptEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonTranscriptEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    languageCode?: import("mongoose").SchemaDefinitionProperty<string, LessonTranscriptEntity, import("mongoose").Document<unknown, {}, LessonTranscriptEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonTranscriptEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    externalTranscriptId?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, LessonTranscriptEntity, import("mongoose").Document<unknown, {}, LessonTranscriptEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonTranscriptEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<LessonTranscriptionStatusEnum, LessonTranscriptEntity, import("mongoose").Document<unknown, {}, LessonTranscriptEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonTranscriptEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    failureReason?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, LessonTranscriptEntity, import("mongoose").Document<unknown, {}, LessonTranscriptEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonTranscriptEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    _id?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, LessonTranscriptEntity, import("mongoose").Document<unknown, {}, LessonTranscriptEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonTranscriptEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdAt?: import("mongoose").SchemaDefinitionProperty<Date, LessonTranscriptEntity, import("mongoose").Document<unknown, {}, LessonTranscriptEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonTranscriptEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedAt?: import("mongoose").SchemaDefinitionProperty<Date, LessonTranscriptEntity, import("mongoose").Document<unknown, {}, LessonTranscriptEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonTranscriptEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    deletedAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, LessonTranscriptEntity, import("mongoose").Document<unknown, {}, LessonTranscriptEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonTranscriptEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, LessonTranscriptEntity, import("mongoose").Document<unknown, {}, LessonTranscriptEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonTranscriptEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, LessonTranscriptEntity, import("mongoose").Document<unknown, {}, LessonTranscriptEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<LessonTranscriptEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, LessonTranscriptEntity>;
