import { RoleEnum } from '../enums/role.enum.js';
import { UserStatusEnum } from '../enums/user-status.enum.js';
import { AuthProviderEnum } from '../enums/auth-provider.enum.js';

export interface IUser {
  id: string;
  email: string;
  password?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatar?: string | null;
  role: RoleEnum;
  status: UserStatusEnum;
  provider: AuthProviderEnum;
  providerId?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;
  createdById?: string | null;
  updatedById?: string | null;
}

export interface IUserProfile {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  avatar?: string | null;
  role: RoleEnum;
  status: UserStatusEnum;
  provider: AuthProviderEnum;
}
