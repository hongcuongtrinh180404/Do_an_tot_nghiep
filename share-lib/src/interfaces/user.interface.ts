import { RoleEnum } from '../enums/role.enum.js';
import { UserStatusEnum } from '../enums/user-status.enum.js';
import { AuthProviderEnum } from '../enums/auth-provider.enum.js';

export interface IUser {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  username?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  role: RoleEnum;
  status: UserStatusEnum;
  /** @deprecated Kept for backward compatibility during migration */
  password?: string | null;
  /** @deprecated Kept for backward compatibility during migration */
  firstName?: string | null;
  /** @deprecated Kept for backward compatibility during migration */
  lastName?: string | null;
  /** @deprecated Kept for backward compatibility during migration */
  avatar?: string | null;
  /** @deprecated Kept for backward compatibility during migration */
  provider?: AuthProviderEnum;
  /** @deprecated Kept for backward compatibility during migration */
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
  fullName: string;
  username?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  role: RoleEnum;
  status: UserStatusEnum;
  /** @deprecated Kept for backward compatibility during migration */
  firstName?: string | null;
  /** @deprecated Kept for backward compatibility during migration */
  lastName?: string | null;
  /** @deprecated Kept for backward compatibility during migration */
  avatar?: string | null;
  /** @deprecated Kept for backward compatibility during migration */
  provider?: AuthProviderEnum;
}

