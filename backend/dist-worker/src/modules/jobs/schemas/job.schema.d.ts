import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { IJob, JobStatusEnum, JobTypeEnum, JobPhaseEnum } from 'share-lib';
import { BaseAbstractDocument } from '../../base/documents/base.abstract.document.js';
export type JobDocument = HydratedDocument<Job>;
export declare class Job extends BaseAbstractDocument implements Omit<IJob, 'id'> {
    type: JobTypeEnum;
    lessonId: string;
    courseId: string;
    requestedById: string;
    correlationId: string;
    idempotencyKey?: string | null;
    requestHash?: string | null;
    parameters: Record<string, unknown>;
    active: boolean;
    status: JobStatusEnum;
    phase: JobPhaseEnum;
    attempts: number;
    maxAttempts: number;
    nextRunAt?: Date | null;
    workerId?: string | null;
    leaseToken?: string | null;
    leaseExpiresAt?: Date | null;
    heartbeatAt?: Date | null;
    dispatchState: 'pending' | 'published';
    dispatchSequence: number;
    publishedAt?: Date | null;
    inputRevision: number;
    targetRevision: number;
    resultRef?: Record<string, unknown> | null;
    errorCode?: string | null;
    errorMessage?: string | null;
    startedAt?: Date | null;
    completedAt?: Date | null;
    failedAt?: Date | null;
    retryOfJobId?: string | null;
}
export declare const JobSchema: MongooseSchema<Job, import("mongoose").Model<Job, any, any, any, any, any, Job>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Job, import("mongoose").Document<unknown, {}, Job, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Job & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    type?: import("mongoose").SchemaDefinitionProperty<JobTypeEnum, Job, import("mongoose").Document<unknown, {}, Job, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Job & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    lessonId?: import("mongoose").SchemaDefinitionProperty<string, Job, import("mongoose").Document<unknown, {}, Job, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Job & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    courseId?: import("mongoose").SchemaDefinitionProperty<string, Job, import("mongoose").Document<unknown, {}, Job, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Job & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    requestedById?: import("mongoose").SchemaDefinitionProperty<string, Job, import("mongoose").Document<unknown, {}, Job, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Job & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    correlationId?: import("mongoose").SchemaDefinitionProperty<string, Job, import("mongoose").Document<unknown, {}, Job, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Job & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    idempotencyKey?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, Job, import("mongoose").Document<unknown, {}, Job, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Job & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    requestHash?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, Job, import("mongoose").Document<unknown, {}, Job, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Job & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    parameters?: import("mongoose").SchemaDefinitionProperty<Record<string, unknown>, Job, import("mongoose").Document<unknown, {}, Job, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Job & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    active?: import("mongoose").SchemaDefinitionProperty<boolean, Job, import("mongoose").Document<unknown, {}, Job, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Job & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<JobStatusEnum, Job, import("mongoose").Document<unknown, {}, Job, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Job & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    phase?: import("mongoose").SchemaDefinitionProperty<JobPhaseEnum, Job, import("mongoose").Document<unknown, {}, Job, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Job & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    attempts?: import("mongoose").SchemaDefinitionProperty<number, Job, import("mongoose").Document<unknown, {}, Job, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Job & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    maxAttempts?: import("mongoose").SchemaDefinitionProperty<number, Job, import("mongoose").Document<unknown, {}, Job, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Job & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    nextRunAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, Job, import("mongoose").Document<unknown, {}, Job, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Job & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    workerId?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, Job, import("mongoose").Document<unknown, {}, Job, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Job & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    leaseToken?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, Job, import("mongoose").Document<unknown, {}, Job, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Job & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    leaseExpiresAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, Job, import("mongoose").Document<unknown, {}, Job, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Job & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    heartbeatAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, Job, import("mongoose").Document<unknown, {}, Job, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Job & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    dispatchState?: import("mongoose").SchemaDefinitionProperty<"pending" | "published", Job, import("mongoose").Document<unknown, {}, Job, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Job & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    dispatchSequence?: import("mongoose").SchemaDefinitionProperty<number, Job, import("mongoose").Document<unknown, {}, Job, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Job & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    publishedAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, Job, import("mongoose").Document<unknown, {}, Job, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Job & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    inputRevision?: import("mongoose").SchemaDefinitionProperty<number, Job, import("mongoose").Document<unknown, {}, Job, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Job & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    targetRevision?: import("mongoose").SchemaDefinitionProperty<number, Job, import("mongoose").Document<unknown, {}, Job, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Job & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    resultRef?: import("mongoose").SchemaDefinitionProperty<Record<string, unknown> | null | undefined, Job, import("mongoose").Document<unknown, {}, Job, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Job & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    errorCode?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, Job, import("mongoose").Document<unknown, {}, Job, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Job & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    errorMessage?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, Job, import("mongoose").Document<unknown, {}, Job, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Job & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    startedAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, Job, import("mongoose").Document<unknown, {}, Job, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Job & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    completedAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, Job, import("mongoose").Document<unknown, {}, Job, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Job & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    failedAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, Job, import("mongoose").Document<unknown, {}, Job, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Job & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    retryOfJobId?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, Job, import("mongoose").Document<unknown, {}, Job, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Job & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    _id?: import("mongoose").SchemaDefinitionProperty<import("mongoose").Types.ObjectId, Job, import("mongoose").Document<unknown, {}, Job, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Job & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdAt?: import("mongoose").SchemaDefinitionProperty<Date, Job, import("mongoose").Document<unknown, {}, Job, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Job & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedAt?: import("mongoose").SchemaDefinitionProperty<Date, Job, import("mongoose").Document<unknown, {}, Job, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Job & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    deletedAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, Job, import("mongoose").Document<unknown, {}, Job, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Job & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, Job, import("mongoose").Document<unknown, {}, Job, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Job & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, Job, import("mongoose").Document<unknown, {}, Job, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Job & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, Job>;
