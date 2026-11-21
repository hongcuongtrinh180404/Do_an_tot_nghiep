import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { BaseAbstractDocument } from '../../base/index.js';
import { ReviewStatusEnum, type ReviewModerationAction } from 'share-lib';
export type ReviewDocument = HydratedDocument<ReviewEntity>;
export declare class ReviewModerationEntrySchema {
    action: ReviewModerationAction;
    adminId: Types.ObjectId;
    adminName?: string | null;
    reason?: string | null;
    createdAt: Date;
}
export declare const ReviewModerationEntryModelSchema: MongooseSchema<ReviewModerationEntrySchema, import("mongoose").Model<ReviewModerationEntrySchema, any, any, any, any, any, ReviewModerationEntrySchema>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ReviewModerationEntrySchema, import("mongoose").Document<unknown, {}, ReviewModerationEntrySchema, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<ReviewModerationEntrySchema & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    action?: import("mongoose").SchemaDefinitionProperty<ReviewModerationAction, ReviewModerationEntrySchema, import("mongoose").Document<unknown, {}, ReviewModerationEntrySchema, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ReviewModerationEntrySchema & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    adminId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, ReviewModerationEntrySchema, import("mongoose").Document<unknown, {}, ReviewModerationEntrySchema, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ReviewModerationEntrySchema & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    adminName?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, ReviewModerationEntrySchema, import("mongoose").Document<unknown, {}, ReviewModerationEntrySchema, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ReviewModerationEntrySchema & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    reason?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, ReviewModerationEntrySchema, import("mongoose").Document<unknown, {}, ReviewModerationEntrySchema, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ReviewModerationEntrySchema & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdAt?: import("mongoose").SchemaDefinitionProperty<Date, ReviewModerationEntrySchema, import("mongoose").Document<unknown, {}, ReviewModerationEntrySchema, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ReviewModerationEntrySchema & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, ReviewModerationEntrySchema>;
export declare class ReviewReportEntrySchema {
    userId: Types.ObjectId;
    userName?: string | null;
    reason: string;
    createdAt: Date;
}
export declare const ReviewReportEntryModelSchema: MongooseSchema<ReviewReportEntrySchema, import("mongoose").Model<ReviewReportEntrySchema, any, any, any, any, any, ReviewReportEntrySchema>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ReviewReportEntrySchema, import("mongoose").Document<unknown, {}, ReviewReportEntrySchema, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<ReviewReportEntrySchema & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    userId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, ReviewReportEntrySchema, import("mongoose").Document<unknown, {}, ReviewReportEntrySchema, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ReviewReportEntrySchema & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    userName?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, ReviewReportEntrySchema, import("mongoose").Document<unknown, {}, ReviewReportEntrySchema, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ReviewReportEntrySchema & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    reason?: import("mongoose").SchemaDefinitionProperty<string, ReviewReportEntrySchema, import("mongoose").Document<unknown, {}, ReviewReportEntrySchema, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ReviewReportEntrySchema & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdAt?: import("mongoose").SchemaDefinitionProperty<Date, ReviewReportEntrySchema, import("mongoose").Document<unknown, {}, ReviewReportEntrySchema, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ReviewReportEntrySchema & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, ReviewReportEntrySchema>;
export declare class ReviewInstructorReplyEntrySchema {
    content: string;
    instructorId: Types.ObjectId;
    instructorName?: string | null;
    repliedAt: Date;
    updatedAt?: Date | null;
}
export declare const ReviewInstructorReplyEntryModelSchema: MongooseSchema<ReviewInstructorReplyEntrySchema, import("mongoose").Model<ReviewInstructorReplyEntrySchema, any, any, any, any, any, ReviewInstructorReplyEntrySchema>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ReviewInstructorReplyEntrySchema, import("mongoose").Document<unknown, {}, ReviewInstructorReplyEntrySchema, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<ReviewInstructorReplyEntrySchema & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    content?: import("mongoose").SchemaDefinitionProperty<string, ReviewInstructorReplyEntrySchema, import("mongoose").Document<unknown, {}, ReviewInstructorReplyEntrySchema, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ReviewInstructorReplyEntrySchema & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    instructorId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, ReviewInstructorReplyEntrySchema, import("mongoose").Document<unknown, {}, ReviewInstructorReplyEntrySchema, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ReviewInstructorReplyEntrySchema & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    instructorName?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, ReviewInstructorReplyEntrySchema, import("mongoose").Document<unknown, {}, ReviewInstructorReplyEntrySchema, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ReviewInstructorReplyEntrySchema & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    repliedAt?: import("mongoose").SchemaDefinitionProperty<Date, ReviewInstructorReplyEntrySchema, import("mongoose").Document<unknown, {}, ReviewInstructorReplyEntrySchema, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ReviewInstructorReplyEntrySchema & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, ReviewInstructorReplyEntrySchema, import("mongoose").Document<unknown, {}, ReviewInstructorReplyEntrySchema, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ReviewInstructorReplyEntrySchema & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, ReviewInstructorReplyEntrySchema>;
export declare class ReviewAdminReplyEntrySchema {
    content: string;
    adminId: Types.ObjectId;
    adminName?: string | null;
    repliedAt: Date;
    updatedAt?: Date | null;
    updatedById?: Types.ObjectId | null;
    updatedByName?: string | null;
}
export declare const ReviewAdminReplyEntryModelSchema: MongooseSchema<ReviewAdminReplyEntrySchema, import("mongoose").Model<ReviewAdminReplyEntrySchema, any, any, any, any, any, ReviewAdminReplyEntrySchema>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ReviewAdminReplyEntrySchema, import("mongoose").Document<unknown, {}, ReviewAdminReplyEntrySchema, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<ReviewAdminReplyEntrySchema & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    content?: import("mongoose").SchemaDefinitionProperty<string, ReviewAdminReplyEntrySchema, import("mongoose").Document<unknown, {}, ReviewAdminReplyEntrySchema, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ReviewAdminReplyEntrySchema & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    adminId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, ReviewAdminReplyEntrySchema, import("mongoose").Document<unknown, {}, ReviewAdminReplyEntrySchema, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ReviewAdminReplyEntrySchema & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    adminName?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, ReviewAdminReplyEntrySchema, import("mongoose").Document<unknown, {}, ReviewAdminReplyEntrySchema, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ReviewAdminReplyEntrySchema & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    repliedAt?: import("mongoose").SchemaDefinitionProperty<Date, ReviewAdminReplyEntrySchema, import("mongoose").Document<unknown, {}, ReviewAdminReplyEntrySchema, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ReviewAdminReplyEntrySchema & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, ReviewAdminReplyEntrySchema, import("mongoose").Document<unknown, {}, ReviewAdminReplyEntrySchema, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ReviewAdminReplyEntrySchema & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedById?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId | null | undefined, ReviewAdminReplyEntrySchema, import("mongoose").Document<unknown, {}, ReviewAdminReplyEntrySchema, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ReviewAdminReplyEntrySchema & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedByName?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, ReviewAdminReplyEntrySchema, import("mongoose").Document<unknown, {}, ReviewAdminReplyEntrySchema, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ReviewAdminReplyEntrySchema & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, ReviewAdminReplyEntrySchema>;
export declare class ReviewEntity extends BaseAbstractDocument {
    userId: Types.ObjectId;
    courseId: Types.ObjectId;
    rating: number;
    comment?: string | null;
    status: ReviewStatusEnum;
    hideReason?: string | null;
    moderationHistory: ReviewModerationEntrySchema[];
    reports: ReviewReportEntrySchema[];
    reportCount: number;
    instructorReply?: ReviewInstructorReplyEntrySchema | null;
    adminReply?: ReviewAdminReplyEntrySchema | null;
}
export declare const ReviewSchema: MongooseSchema<ReviewEntity, import("mongoose").Model<ReviewEntity, any, any, any, any, any, ReviewEntity>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ReviewEntity, import("mongoose").Document<unknown, {}, ReviewEntity, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<ReviewEntity & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    userId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, ReviewEntity, import("mongoose").Document<unknown, {}, ReviewEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ReviewEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    courseId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, ReviewEntity, import("mongoose").Document<unknown, {}, ReviewEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ReviewEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    rating?: import("mongoose").SchemaDefinitionProperty<number, ReviewEntity, import("mongoose").Document<unknown, {}, ReviewEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ReviewEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    comment?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, ReviewEntity, import("mongoose").Document<unknown, {}, ReviewEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ReviewEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<ReviewStatusEnum, ReviewEntity, import("mongoose").Document<unknown, {}, ReviewEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ReviewEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    hideReason?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, ReviewEntity, import("mongoose").Document<unknown, {}, ReviewEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ReviewEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    moderationHistory?: import("mongoose").SchemaDefinitionProperty<ReviewModerationEntrySchema[], ReviewEntity, import("mongoose").Document<unknown, {}, ReviewEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ReviewEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    reports?: import("mongoose").SchemaDefinitionProperty<ReviewReportEntrySchema[], ReviewEntity, import("mongoose").Document<unknown, {}, ReviewEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ReviewEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    reportCount?: import("mongoose").SchemaDefinitionProperty<number, ReviewEntity, import("mongoose").Document<unknown, {}, ReviewEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ReviewEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    instructorReply?: import("mongoose").SchemaDefinitionProperty<ReviewInstructorReplyEntrySchema | null | undefined, ReviewEntity, import("mongoose").Document<unknown, {}, ReviewEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ReviewEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    adminReply?: import("mongoose").SchemaDefinitionProperty<ReviewAdminReplyEntrySchema | null | undefined, ReviewEntity, import("mongoose").Document<unknown, {}, ReviewEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ReviewEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    _id?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, ReviewEntity, import("mongoose").Document<unknown, {}, ReviewEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ReviewEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdAt?: import("mongoose").SchemaDefinitionProperty<Date, ReviewEntity, import("mongoose").Document<unknown, {}, ReviewEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ReviewEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedAt?: import("mongoose").SchemaDefinitionProperty<Date, ReviewEntity, import("mongoose").Document<unknown, {}, ReviewEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ReviewEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    deletedAt?: import("mongoose").SchemaDefinitionProperty<Date | null | undefined, ReviewEntity, import("mongoose").Document<unknown, {}, ReviewEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ReviewEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    createdById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, ReviewEntity, import("mongoose").Document<unknown, {}, ReviewEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ReviewEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    updatedById?: import("mongoose").SchemaDefinitionProperty<string | null | undefined, ReviewEntity, import("mongoose").Document<unknown, {}, ReviewEntity, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ReviewEntity & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, ReviewEntity>;
