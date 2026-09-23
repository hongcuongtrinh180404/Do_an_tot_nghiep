import { RoleEnum } from '../enums/role.enum.js';
import { IUserProfile } from './user.interface.js';

export interface ILoginPayload {
  email: string;
  password: string;
}

export interface IRegisterPayload {
  email: string;
  password: string;
  fullName?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
}

export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface IAuthResponse {
  user: IUserProfile;
  tokens: IAuthTokens;
}

export interface IJwtPayload {
  sub: string;
  email: string;
  role: RoleEnum;
  iat?: number;
  exp?: number;
}
