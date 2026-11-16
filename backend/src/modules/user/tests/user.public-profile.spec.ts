import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { RoleEnum } from 'share-lib';
import { UserController } from '../user.controller.js';
import { UserService } from '../services/user.service.js';
import { UpdateProfileDto } from '../dto/update-profile.dto.js';
import { UpdateUserAdminDto } from '../dto/update-user-admin.dto.js';
import { RegisterDto } from '../../auth/dto/register.dto.js';
import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator.js';
import { ROLES_KEY } from '../../auth/decorators/roles.decorator.js';

describe('public profile HTTP contract', () => {
  it('is publicly accessible without granting access to the protected profile/admin routes', () => {
    const handler = (name: string): object =>
      Object.getOwnPropertyDescriptor(UserController.prototype, name)!.value as object;
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler('getPublicProfile'))).toBe(true);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler('getProfile'))).toBeUndefined();
    expect(Reflect.getMetadata(ROLES_KEY, handler('getUserDetail'))).toEqual([RoleEnum.ADMIN]);
  });

  it('resolves the username instead of the authenticated user ID', async () => {
    const profile = { username: 'sseu1804', fullName: 'Cuong Trinh' };
    const service = { getPublicProfileByUsername: vi.fn().mockResolvedValue(profile) };
    const controller = new UserController(service as unknown as UserService);
    const response = await controller.getPublicProfile('sseu1804');
    expect(service.getPublicProfileByUsername).toHaveBeenCalledWith('sseu1804');
    expect(response.data).toEqual(profile);
  });

  it.each([
    [UpdateProfileDto, { fullName: 'Valid Name' }],
    [UpdateUserAdminDto, { fullName: 'Valid Name' }],
    [RegisterDto, { email: 'valid@gmail.com', password: 'Password123@' }],
  ])('rejects caller-owned username in %s', async (metatype, payload) => {
    const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
    await expect(pipe.transform(
      { ...payload, username: 'manually-chosen' },
      { type: 'body', metatype },
    )).rejects.toThrow(BadRequestException);
  });
});
