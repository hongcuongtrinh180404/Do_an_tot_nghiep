import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { ClientSession } from 'mongoose';
import { ISession, AUTH_CONSTANTS } from 'share-lib';
import { BaseService } from '../../base/index.js';
import { SessionRepository } from '../repositories/session.repository.js';

export interface RotateSessionResult {
  session: ISession;
  isReusedGrace: boolean;
}

@Injectable()
export class SessionService extends BaseService<ISession, string> {
  constructor(
    protected readonly sessionRepository: SessionRepository,
    cls: ClsService,
  ) {
    super(sessionRepository, cls, SessionService.name);
  }

  async createOrUpdateSession(
    userId: string,
    refreshTokenHash: string,
    expiresAt: Date,
    session?: ClientSession,
  ): Promise<ISession> {
    const existing = await this.sessionRepository.findActiveByUserId(userId, session);

    if (existing) {
      const updated = await this.sessionRepository.update(
        existing.id,
        {
          previousRefreshTokenHash: existing.refreshTokenHash,
          refreshTokenHash,
          hashRotatedAt: new Date(),
          expiresAt,
          isRevoked: false,
        },
        session,
      );
      return updated!;
    }

    return this.sessionRepository.create(
      {
        userId,
        refreshTokenHash,
        expiresAt,
        isRevoked: false,
      },
      session,
    );
  }

  async validateAndRotateSession(
    userId: string,
    incomingHash: string,
    newHash: string,
    newExpiresAt: Date,
    session?: ClientSession,
  ): Promise<RotateSessionResult> {
    const activeSession = await this.sessionRepository.findActiveByUserId(userId, session);

    if (!activeSession) {
      throw new UnauthorizedException('No active session found. Please log in again.');
    }

    // Case 1: Token hash matches current active hash -> standard rotation
    if (activeSession.refreshTokenHash === incomingHash) {
      const updated = await this.sessionRepository.update(
        activeSession.id,
        {
          previousRefreshTokenHash: activeSession.refreshTokenHash,
          refreshTokenHash: newHash,
          hashRotatedAt: new Date(),
          expiresAt: newExpiresAt,
        },
        session,
      );

      return {
        session: updated!,
        isReusedGrace: false,
      };
    }

    // Case 2: Token hash matches previous hash -> check 30s Grace Period
    if (activeSession.previousRefreshTokenHash === incomingHash) {
      const rotatedAt = activeSession.hashRotatedAt ? new Date(activeSession.hashRotatedAt).getTime() : 0;
      const now = Date.now();
      const elapsed = now - rotatedAt;

      if (elapsed <= AUTH_CONSTANTS.SESSION_GRACE_PERIOD_MS) {
        this.logger.warn(
          `[GracePeriod] Concurrent token refresh within grace window (${elapsed}ms <= ${AUTH_CONSTANTS.SESSION_GRACE_PERIOD_MS}ms) for user ${userId}`,
        );
        return {
          session: activeSession,
          isReusedGrace: true,
        };
      }

      // Grace period expired -> potential replay attack
      this.logger.error(
        `[TokenTheft] Replay attack detected for user ${userId}. Grace period expired (${elapsed}ms). Revoking all sessions.`,
      );
      await this.revokeAllUserSessions(userId, session);
      throw new UnauthorizedException('Token reuse detected. All sessions have been revoked.');
    }

    // Case 3: Token does not match active or previous hash
    this.logger.warn(`[InvalidToken] Refresh token hash mismatch for user ${userId}`);
    throw new UnauthorizedException('Invalid refresh token.');
  }

  async revokeAllUserSessions(userId: string, session?: ClientSession): Promise<boolean> {
    return this.sessionRepository.revokeAllByUserId(userId, session);
  }
}
