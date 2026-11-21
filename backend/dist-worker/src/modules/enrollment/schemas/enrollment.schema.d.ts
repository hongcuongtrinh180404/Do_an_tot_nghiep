import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { BaseAbstractDocument } from '../../base/index.js';
export type EnrollmentDocument = HydratedDocument<EnrollmentEntity>;
export declare class EnrollmentEntity extends BaseAbstractDocument {
    userId: Types.ObjectId;
    courseId: Types.ObjectId;
    orderId?: Types.ObjectId | null;
    enrolledAt: Date;
}
export declare const EnrollmentSchema: MongooseSchema<EnrollmentEntity, import("mongoose").Model<EnrollmentEntity, any, any, any, any, any, EnrollmentEntity>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, EnrollmentEntity, import("mongoose").Document<unknown, {}, EnrollmentEntity, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<EnrollmentEntity & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    userId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, EnrollmentEntity, import("mongoose").Document<unknown, {}, EnrollmentEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<EnrollmentEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    courseId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, EnrollmentEntity, import("mongoose").Document<unknown, {}, EnrollmentEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<EnrollmentEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    orderId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId | null | undefined, EnrollmentEntity, import("mongoose").Document<unknown, {}, EnrollmentEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<EnrollmentEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    enrolledAt?: import("mongoose").SchemaDefinitionProperty<Date, EnrollmentEntity, import("mongoose").Document<unknown, {}, EnrollmentEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<EnrollmentEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    _id?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, EnrollmentEntity, import("mongoose").Document<unknown, {}, EnrollmentEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<EnrollmentEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdAt?: import("mongoose").SchemaDefinitionProperty<Date, EnrollmentEntity, import("mongoose").Document<unknown, {}, EnrollmentEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<EnrollmentEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedAt?: import("mongoose").SchemaDefinitionProperty<Date, EnrollmentEntity, import("mongoose").Document<unknown, {}, EnrollmentEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<EnrollmentEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    deletedAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, EnrollmentEntity, import("mongoose").Document<unknown, {}, EnrollmentEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<EnrollmentEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, EnrollmentEntity, import("mongoose").Document<unknown, {}, EnrollmentEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<EnrollmentEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, EnrollmentEntity, import("mongoose").Document<unknown, {}, EnrollmentEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<EnrollmentEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, EnrollmentEntity>;
