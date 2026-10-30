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
  /** Unique token id, used to make every refresh token distinct. */
  jti?: string;
  iat?: number;
  exp?: number;
}

export interface IGoogleAuthPayload {
  idToken: string;
}

export interface IVerifyEmailPayload {
  token: string;
}

export interface IResendVerificationPayload {
  email: string;
}

export interface IForgotPasswordPayload {
  email: string;
}

export interface IForgotPasswordResponse {
  message: string;
}

export interface IResetPasswordPayload {
  token: string;
  password: string;
}

export interface IResetPasswordResponse {
  message: string;
}

export interface IRegisterResponse {
  user: IUserProfile;
  message: string;
  emailSent: boolean;
}
