import { Model, ClientSession } from 'mongoose';
import { ISession } from 'share-lib';
import { BaseMongoRepository } from '../../base/index.js';
import { SessionEntity } from '../schemas/session.schema.js';
export declare class SessionRepository extends BaseMongoRepository<ISession, SessionEntity> {
    constructor(sessionModel: Model<SessionEntity>);
    findActiveByUserId(userId: string, session?: ClientSession): Promise<ISession | null>;
    rotateIfCurrent(userId: string, incomingHash: string, newHash: string, newExpiresAt: Date, session?: ClientSession): Promise<ISession | null>;
    revokeAllByUserId(userId: string, session?: ClientSession): Promise<boolean>;
}
