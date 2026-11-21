import { ClsService } from 'nestjs-cls';
import { ClientSession } from 'mongoose';
import { ISession } from 'share-lib';
import { BaseService } from '../../base/index.js';
import { SessionRepository } from '../repositories/session.repository.js';
export interface RotateSessionResult {
    session: ISession;
    isReusedGrace: boolean;
}
export declare class SessionService extends BaseService<ISession, string> {
    protected readonly sessionRepository: SessionRepository;
    constructor(sessionRepository: SessionRepository, cls: ClsService);
    createOrUpdateSession(userId: string, refreshTokenHash: string, expiresAt: Date, session?: ClientSession): Promise<ISession>;
    validateAndRotateSession(userId: string, incomingHash: string, newHash: string, newExpiresAt: Date, session?: ClientSession): Promise<RotateSessionResult>;
    revokeAllUserSessions(userId: string, session?: ClientSession): Promise<boolean>;
}
