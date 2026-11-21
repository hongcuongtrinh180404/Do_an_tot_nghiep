var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SessionService_1;
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { AUTH_CONSTANTS } from 'share-lib';
import { BaseService } from '../../base/index.js';
import { SessionRepository } from '../repositories/session.repository.js';
let SessionService = SessionService_1 = class SessionService extends BaseService {
    sessionRepository;
    constructor(sessionRepository, cls) {
        super(sessionRepository, cls, SessionService_1.name);
        this.sessionRepository = sessionRepository;
    }
    async createOrUpdateSession(userId, refreshTokenHash, expiresAt, session) {
        const existing = await this.sessionRepository.findActiveByUserId(userId, session);
        if (existing) {
            const updated = await this.sessionRepository.update(existing.id, {
                previousRefreshTokenHash: existing.refreshTokenHash,
                refreshTokenHash,
                hashRotatedAt: new Date(),
                expiresAt,
                isRevoked: false,
            }, session);
            return updated;
        }
        return this.sessionRepository.create({
            userId,
            refreshTokenHash,
            expiresAt,
            isRevoked: false,
        }, session);
    }
    async validateAndRotateSession(userId, incomingHash, newHash, newExpiresAt, session) {
        const rotatedSession = await this.sessionRepository.rotateIfCurrent(userId, incomingHash, newHash, newExpiresAt, session);
        if (rotatedSession) {
            return {
                session: rotatedSession,
                isReusedGrace: false,
            };
        }
        const activeSession = await this.sessionRepository.findActiveByUserId(userId, session);
        if (!activeSession) {
            throw new UnauthorizedException('No active session found. Please log in again.');
        }
        if (activeSession.previousRefreshTokenHash === incomingHash) {
            const rotatedAt = activeSession.hashRotatedAt ? new Date(activeSession.hashRotatedAt).getTime() : 0;
            const now = Date.now();
            const elapsed = now - rotatedAt;
            if (elapsed <= AUTH_CONSTANTS.SESSION_GRACE_PERIOD_MS) {
                this.logger.warn(`[GracePeriod] Concurrent token refresh within grace window (${elapsed}ms <= ${AUTH_CONSTANTS.SESSION_GRACE_PERIOD_MS}ms) for user ${userId}`);
                return {
                    session: activeSession,
                    isReusedGrace: true,
                };
            }
            this.logger.error(`[TokenTheft] Replay attack detected for user ${userId}. Grace period expired (${elapsed}ms). Revoking all sessions.`);
            await this.revokeAllUserSessions(userId, session);
            throw new UnauthorizedException('Token reuse detected. All sessions have been revoked.');
        }
        this.logger.warn(`[InvalidToken] Refresh token hash mismatch for user ${userId}`);
        throw new UnauthorizedException('Invalid refresh token.');
    }
    async revokeAllUserSessions(userId, session) {
        return this.sessionRepository.revokeAllByUserId(userId, session);
    }
};
SessionService = SessionService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [SessionRepository,
        ClsService])
], SessionService);
export { SessionService };
//# sourceMappingURL=session.service.js.map