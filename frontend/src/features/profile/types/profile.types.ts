import type { IUserProfile } from 'share-lib';

export interface IUpdateProfilePayload {
  fullName?: string;
  username?: string;
  bio?: string;
  firstName?: string;
  lastName?: string;
}

export interface IAvatarUploadResponse {
  avatar: string;
  user: IUserProfile;
}
