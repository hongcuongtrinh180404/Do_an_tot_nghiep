import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let mockReflector: {
    getAllAndOverride: ReturnType<typeof vi.fn>;
  };

  const createMockContext = (authHeader?: string): ExecutionContext => {
    const mockRequest = {
      headers: authHeader ? { authorization: authHeader } : {},
    };

    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => ({}),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: vi.fn(),
    };
    guard = new JwtAuthGuard(mockReflector as unknown as Reflector);
  });

  describe('canActivate', () => {
    it('1. should return true immediately on public routes when no auth header is present', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);
      const context = createMockContext();

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockReflector.getAllAndOverride).toHaveBeenCalled();
    });

    it('2. should delegate to super.canActivate on public routes when an auth header is present', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);
      const context = createMockContext('Bearer sample_valid_token');

      const superSpy = vi.spyOn(AuthGuard('jwt').prototype, 'canActivate').mockResolvedValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(superSpy).toHaveBeenCalledWith(context);
      superSpy.mockRestore();
    });

    it('3. should delegate to super.canActivate on private routes', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockContext('Bearer token');

      const superSpy = vi.spyOn(AuthGuard('jwt').prototype, 'canActivate').mockResolvedValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(superSpy).toHaveBeenCalledWith(context);
      superSpy.mockRestore();
    });
  });

  describe('handleRequest', () => {
    it('4. should return user payload on public routes when valid user is present', () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);
      const context = createMockContext();
      const mockUser = { id: 'user_123', email: 'user@example.com', role: 'INSTRUCTOR' };

      const result = guard.handleRequest(null, mockUser, null, context);

      expect(result).toEqual(mockUser);
    });

    it('5. should return null without throwing on public routes when token is missing or expired', () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);
      const context = createMockContext();

      const result = guard.handleRequest(new Error('jwt expired'), null, null, context);

      expect(result).toBeNull();
    });

    it('6. should throw UnauthorizedException on private routes when user is null or error occurs', () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockContext();

      expect(() => guard.handleRequest(null, null, null, context)).toThrow(UnauthorizedException);
    });

    it('7. should return user on private routes when authenticated', () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockContext();
      const mockUser = { id: 'admin_1', role: 'ADMIN' };

      const result = guard.handleRequest(null, mockUser, null, context);

      expect(result).toEqual(mockUser);
    });
  });
});

