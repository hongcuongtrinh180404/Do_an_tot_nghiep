import { Types } from 'mongoose';
export declare abstract class BaseAbstractDocument {
    _id: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date | null;
    createdById?: string | null;
    updatedById?: string | null;
}
