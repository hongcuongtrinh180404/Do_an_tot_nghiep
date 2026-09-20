import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleEnum, IUserProfile, UserStatusEnum, AuthProviderEnum } from 'share-lib';
import { RolesGuard } from '../guards/roles.guard.js';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const mockUser: IUserProfile = {
    id: 'user_1',
    email: 'user@example.com',
    role: RoleEnum.USER,
    status: UserStatusEnum.ACTIVE,
    provider: AuthProviderEnum.LOCAL,
  };

  const mockAdmin: IUserProfile = {
    id: 'admin_1',
    email: 'admin@example.com',
    role: RoleEnum.ADMIN,
    status: UserStatusEnum.ACTIVE,
    provider: AuthProviderEnum.LOCAL,
  };

  const createMockContext = (user?: IUserProfile): ExecutionContext => {
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('should allow access if no roles are required', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
    const context = createMockContext(mockUser);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if user is unauthenticated when roles are required', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([RoleEnum.USER]);
    const context = createMockContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should allow Admin to bypass restrictions', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([RoleEnum.USER]);
    const context = createMockContext(mockAdmin);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if user has required role', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([RoleEnum.USER]);
    const context = createMockContext(mockUser);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access if user does not have required role', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([RoleEnum.ADMIN]);
    const context = createMockContext(mockUser);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
