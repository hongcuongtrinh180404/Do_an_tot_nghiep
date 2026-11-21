import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { RoleEnum, UserStatusEnum, AuthProviderEnum, type ISocialLinks } from 'share-lib';
import { BaseAbstractDocument } from '../../base/index.js';
export type UserDocument = HydratedDocument<UserEntity>;
export declare class UserEntity extends BaseAbstractDocument {
    email: string;
    passwordHash?: string | null;
    fullName: string;
    username?: string | null;
    avatarUrl?: string | null;
    googleSub?: string | null;
    provider?: AuthProviderEnum;
    providerId?: string | null;
    bio?: string | null;
    socialLinks?: ISocialLinks | null;
    role: RoleEnum;
    status: UserStatusEnum;
    commissionRate?: number;
    commissionRateUpdatedAt?: Date | null;
    commissionRateUpdatedById?: Types.ObjectId | null;
    isEmailVerified: boolean;
    emailVerificationToken?: string | null;
    emailVerificationExpires?: Date | null;
    passwordResetTokenHash?: string | null;
    passwordResetExpires?: Date | null;
    passwordResetRequestedAt?: Date | null;
    pendingNewEmail?: string | null;
    emailChangeTokenHash?: string | null;
    emailChangeExpires?: Date | null;
    emailChangeRequestedAt?: Date | null;
}
export declare const UserSchema: MongooseSchema<UserEntity, import("mongoose").Model<UserEntity, any, any, any, any, any, UserEntity>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, UserEntity, import("mongoose").Document<unknown, {}, UserEntity, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<UserEntity & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    email?: import("mongoose").SchemaDefinitionProperty<string, UserEntity, import("mongoose").Document<unknown, {}, UserEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    passwordHash?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, UserEntity, import("mongoose").Document<unknown, {}, UserEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    fullName?: import("mongoose").SchemaDefinitionProperty<string, UserEntity, import("mongoose").Document<unknown, {}, UserEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    username?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, UserEntity, import("mongoose").Document<unknown, {}, UserEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    avatarUrl?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, UserEntity, import("mongoose").Document<unknown, {}, UserEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    googleSub?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, UserEntity, import("mongoose").Document<unknown, {}, UserEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    provider?: import("mongoose").SchemaDefinitionProperty<AuthProviderEnum | undefined, UserEntity, import("mongoose").Document<unknown, {}, UserEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    providerId?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, UserEntity, import("mongoose").Document<unknown, {}, UserEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    bio?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, UserEntity, import("mongoose").Document<unknown, {}, UserEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    socialLinks?: import("mongoose").SchemaDefinitionProperty<ISocialLinks | null | undefined, UserEntity, import("mongoose").Document<unknown, {}, UserEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    role?: import("mongoose").SchemaDefinitionProperty<RoleEnum, UserEntity, import("mongoose").Document<unknown, {}, UserEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<UserStatusEnum, UserEntity, import("mongoose").Document<unknown, {}, UserEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    commissionRate?: import("mongoose").SchemaDefinitionProperty<number | undefined, UserEntity, import("mongoose").Document<unknown, {}, UserEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    commissionRateUpdatedAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, UserEntity, import("mongoose").Document<unknown, {}, UserEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    commissionRateUpdatedById?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId | null | undefined, UserEntity, import("mongoose").Document<unknown, {}, UserEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    isEmailVerified?: import("mongoose").SchemaDefinitionProperty<boolean, UserEntity, import("mongoose").Document<unknown, {}, UserEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    emailVerificationToken?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, UserEntity, import("mongoose").Document<unknown, {}, UserEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    emailVerificationExpires?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, UserEntity, import("mongoose").Document<unknown, {}, UserEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    passwordResetTokenHash?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, UserEntity, import("mongoose").Document<unknown, {}, UserEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    passwordResetExpires?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, UserEntity, import("mongoose").Document<unknown, {}, UserEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    passwordResetRequestedAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, UserEntity, import("mongoose").Document<unknown, {}, UserEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    pendingNewEmail?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, UserEntity, import("mongoose").Document<unknown, {}, UserEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    emailChangeTokenHash?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, UserEntity, import("mongoose").Document<unknown, {}, UserEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    emailChangeExpires?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, UserEntity, import("mongoose").Document<unknown, {}, UserEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    emailChangeRequestedAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, UserEntity, import("mongoose").Document<unknown, {}, UserEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    _id?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, UserEntity, import("mongoose").Document<unknown, {}, UserEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdAt?: import("mongoose").SchemaDefinitionProperty<Date, UserEntity, import("mongoose").Document<unknown, {}, UserEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedAt?: import("mongoose").SchemaDefinitionProperty<Date, UserEntity, import("mongoose").Document<unknown, {}, UserEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    deletedAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, UserEntity, import("mongoose").Document<unknown, {}, UserEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, UserEntity, import("mongoose").Document<unknown, {}, UserEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, UserEntity, import("mongoose").Document<unknown, {}, UserEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<UserEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, UserEntity>;
