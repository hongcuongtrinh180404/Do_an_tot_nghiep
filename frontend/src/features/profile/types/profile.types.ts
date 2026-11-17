import type { IUserProfile, ISocialLinks } from 'share-lib';

export interface IUpdateProfilePayload {
  fullName?: string;
  bio?: string;
  firstName?: string;
  lastName?: string;
  socialLinks?: ISocialLinks;
}

export interface IAvatarUploadResponse {
  avatar: string;
  user: IUserProfile;
}
