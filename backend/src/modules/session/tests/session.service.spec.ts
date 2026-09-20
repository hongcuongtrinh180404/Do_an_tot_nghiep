import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { ISession } from 'share-lib';
import { SessionService } from '../services/session.service.js';
import { SessionRepository } from '../repositories/session.repository.js';

describe('SessionService', () => {
  let service: SessionService;
  let mockSessionRepository: {
    findActiveByUserId: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    revokeAllByUserId: ReturnType<typeof vi.fn>;
  };
  let mockCls: { get: ReturnType<typeof vi.fn> };

  const mockSession: ISession = {
    id: 'session_1',
    userId: 'user_1',
    refreshTokenHash: 'hash_current',
    previousRefreshTokenHash: 'hash_prev',
    hashRotatedAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    isRevoked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockSessionRepository = {
      findActiveByUserId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      revokeAllByUserId: vi.fn(),
    };
    mockCls = {
      get: vi.fn().mockReturnValue('user_1'),
    };

    service = new SessionService(
      mockSessionRepository as unknown as SessionRepository,
      mockCls as unknown as ClsService,
    );
  });

  describe('createOrUpdateSession', () => {
    it('should create new session when no existing session exists', async () => {
      mockSessionRepository.findActiveByUserId.mockResolvedValue(null);
      mockSessionRepository.create.mockResolvedValue(mockSession);

      const expiresAt = new Date();
      const result = await service.createOrUpdateSession('user_1', 'hash_new', expiresAt);

      expect(mockSessionRepository.create).toHaveBeenCalledWith(
        {
          userId: 'user_1',
          refreshTokenHash: 'hash_new',
          expiresAt,
          isRevoked: false,
        },
        undefined,
      );
      expect(result).toEqual(mockSession);
    });

    it('should update existing session and shift previous hash', async () => {
      mockSessionRepository.findActiveByUserId.mockResolvedValue(mockSession);
      mockSessionRepository.update.mockResolvedValue({
        ...mockSession,
        previousRefreshTokenHash: 'hash_current',
        refreshTokenHash: 'hash_brand_new',
      });

      const expiresAt = new Date();
      const result = await service.createOrUpdateSession('user_1', 'hash_brand_new', expiresAt);

      expect(mockSessionRepository.update).toHaveBeenCalledWith(
        'session_1',
        expect.objectContaining({
          previousRefreshTokenHash: 'hash_current',
          refreshTokenHash: 'hash_brand_new',
          expiresAt,
          isRevoked: false,
        }),
        undefined,
      );
      expect(result.refreshTokenHash).toBe('hash_brand_new');
    });
  });

  describe('validateAndRotateSession', () => {
    it('should throw UnauthorizedException when no active session exists', async () => {
      mockSessionRepository.findActiveByUserId.mockResolvedValue(null);

      await expect(
        service.validateAndRotateSession('user_1', 'hash_cur', 'hash_next', new Date()),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should rotate session normally when incoming hash matches current hash', async () => {
      mockSessionRepository.findActiveByUserId.mockResolvedValue(mockSession);
      const updatedSession = {
        ...mockSession,
        previousRefreshTokenHash: 'hash_current',
        refreshTokenHash: 'hash_next',
      };
      mockSessionRepository.update.mockResolvedValue(updatedSession);

      const expiresAt = new Date();
      const result = await service.validateAndRotateSession(
        'user_1',
        'hash_current',
        'hash_next',
        expiresAt,
      );

      expect(result.isReusedGrace).toBe(false);
      expect(result.session).toEqual(updatedSession);
    });

    it('should accept previous hash within 30-second Grace Period for multi-tab concurrency', async () => {
      const recentRotation = new Date(Date.now() - 5000); // 5 seconds ago (< 30s)
      const sessionWithRecentRotation: ISession = {
        ...mockSession,
        previousRefreshTokenHash: 'hash_prev',
        hashRotatedAt: recentRotation,
      };
      mockSessionRepository.findActiveByUserId.mockResolvedValue(sessionWithRecentRotation);

      const result = await service.validateAndRotateSession(
        'user_1',
        'hash_prev',
        'hash_next',
        new Date(),
      );

      expect(result.isReusedGrace).toBe(true);
      expect(result.session).toEqual(sessionWithRecentRotation);
      expect(mockSessionRepository.update).not.toHaveBeenCalled();
    });

    it('should detect replay attack when grace period expired and revoke all user sessions', async () => {
      const oldRotation = new Date(Date.now() - 40000); // 40 seconds ago (> 30s)
      const sessionWithOldRotation: ISession = {
        ...mockSession,
        previousRefreshTokenHash: 'hash_stolen',
        hashRotatedAt: oldRotation,
      };
      mockSessionRepository.findActiveByUserId.mockResolvedValue(sessionWithOldRotation);
      mockSessionRepository.revokeAllByUserId.mockResolvedValue(true);

      await expect(
        service.validateAndRotateSession('user_1', 'hash_stolen', 'hash_next', new Date()),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockSessionRepository.revokeAllByUserId).toHaveBeenCalledWith('user_1', undefined);
    });

    it('should reject when incoming hash matches neither current nor previous hash', async () => {
      mockSessionRepository.findActiveByUserId.mockResolvedValue(mockSession);

      await expect(
        service.validateAndRotateSession('user_1', 'unknown_hash', 'hash_next', new Date()),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('revokeAllUserSessions', () => {
    it('should call repository to revoke all sessions', async () => {
      mockSessionRepository.revokeAllByUserId.mockResolvedValue(true);

      const result = await service.revokeAllUserSessions('user_1');

      expect(mockSessionRepository.revokeAllByUserId).toHaveBeenCalledWith('user_1', undefined);
      expect(result).toBe(true);
    });
  });
});
