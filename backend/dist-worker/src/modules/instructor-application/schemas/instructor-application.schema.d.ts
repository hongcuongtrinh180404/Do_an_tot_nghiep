import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { InstructorApplicationStatusEnum } from 'share-lib';
import { BaseAbstractDocument } from '../../base/index.js';
export type InstructorApplicationDocument = HydratedDocument<InstructorApplicationEntity>;
export declare class InstructorApplicationEntity extends BaseAbstractDocument {
    userId: Types.ObjectId;
    applicantName: string;
    email: string;
    phone: string;
    avatarUrl?: string | null;
    expertises: string[];
    bio: string;
    experience: string;
    cvFileName?: string | null;
    cvFileUrl?: string | null;
    status: InstructorApplicationStatusEnum;
    rejectionReason?: string | null;
    reviewedById?: Types.ObjectId | null;
    reviewedByName?: string | null;
    reviewedAt?: Date | null;
    history: Array<{
        action: string;
        actorId: Types.ObjectId;
        actorName: string;
        actorRole: string;
        comment?: string | null;
        timestamp: Date;
    }>;
}
export declare const InstructorApplicationModelSchema: MongooseSchema<InstructorApplicationEntity, import("mongoose").Model<InstructorApplicationEntity, any, any, any, any, any, InstructorApplicationEntity>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, InstructorApplicationEntity, import("mongoose").Document<unknown, {}, InstructorApplicationEntity, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<InstructorApplicationEntity & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    userId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, InstructorApplicationEntity, import("mongoose").Document<unknown, {}, InstructorApplicationEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InstructorApplicationEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    applicantName?: import("mongoose").SchemaDefinitionProperty<string, InstructorApplicationEntity, import("mongoose").Document<unknown, {}, InstructorApplicationEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InstructorApplicationEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    email?: import("mongoose").SchemaDefinitionProperty<string, InstructorApplicationEntity, import("mongoose").Document<unknown, {}, InstructorApplicationEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InstructorApplicationEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    phone?: import("mongoose").SchemaDefinitionProperty<string, InstructorApplicationEntity, import("mongoose").Document<unknown, {}, InstructorApplicationEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InstructorApplicationEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    avatarUrl?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, InstructorApplicationEntity, import("mongoose").Document<unknown, {}, InstructorApplicationEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InstructorApplicationEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    expertises?: import("mongoose").SchemaDefinitionProperty<string[], InstructorApplicationEntity, import("mongoose").Document<unknown, {}, InstructorApplicationEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InstructorApplicationEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    bio?: import("mongoose").SchemaDefinitionProperty<string, InstructorApplicationEntity, import("mongoose").Document<unknown, {}, InstructorApplicationEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InstructorApplicationEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    experience?: import("mongoose").SchemaDefinitionProperty<string, InstructorApplicationEntity, import("mongoose").Document<unknown, {}, InstructorApplicationEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InstructorApplicationEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    cvFileName?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, InstructorApplicationEntity, import("mongoose").Document<unknown, {}, InstructorApplicationEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InstructorApplicationEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    cvFileUrl?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, InstructorApplicationEntity, import("mongoose").Document<unknown, {}, InstructorApplicationEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InstructorApplicationEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<InstructorApplicationStatusEnum, InstructorApplicationEntity, import("mongoose").Document<unknown, {}, InstructorApplicationEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InstructorApplicationEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    rejectionReason?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, InstructorApplicationEntity, import("mongoose").Document<unknown, {}, InstructorApplicationEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InstructorApplicationEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    reviewedById?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId | null | undefined, InstructorApplicationEntity, import("mongoose").Document<unknown, {}, InstructorApplicationEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InstructorApplicationEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    reviewedByName?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, InstructorApplicationEntity, import("mongoose").Document<unknown, {}, InstructorApplicationEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InstructorApplicationEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    reviewedAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, InstructorApplicationEntity, import("mongoose").Document<unknown, {}, InstructorApplicationEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InstructorApplicationEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    history?: import("mongoose").SchemaDefinitionProperty<{
        action: string;
        actorId: Types.ObjectId;
        actorName: string;
        actorRole: string;
        comment?: string | null;
        timestamp: Date;
    }[], InstructorApplicationEntity, import("mongoose").Document<unknown, {}, InstructorApplicationEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InstructorApplicationEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    _id?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, InstructorApplicationEntity, import("mongoose").Document<unknown, {}, InstructorApplicationEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InstructorApplicationEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdAt?: import("mongoose").SchemaDefinitionProperty<Date, InstructorApplicationEntity, import("mongoose").Document<unknown, {}, InstructorApplicationEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InstructorApplicationEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedAt?: import("mongoose").SchemaDefinitionProperty<Date, InstructorApplicationEntity, import("mongoose").Document<unknown, {}, InstructorApplicationEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InstructorApplicationEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    deletedAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, InstructorApplicationEntity, import("mongoose").Document<unknown, {}, InstructorApplicationEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InstructorApplicationEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, InstructorApplicationEntity, import("mongoose").Document<unknown, {}, InstructorApplicationEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InstructorApplicationEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, InstructorApplicationEntity, import("mongoose").Document<unknown, {}, InstructorApplicationEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<InstructorApplicationEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, InstructorApplicationEntity>;
