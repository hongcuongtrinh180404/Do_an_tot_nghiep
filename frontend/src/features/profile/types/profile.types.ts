import type { IUserProfile } from 'share-lib';

export interface IUpdateProfilePayload {
  firstName?: string;
  lastName?: string;
}

export interface IAvatarUploadResponse {
  avatar: string;
  user: IUserProfile;
}
