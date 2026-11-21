import { RoleEnum, UserStatusEnum } from 'share-lib';
export interface IUserSeedItem {
    email: string;
    fullName: string;
    role: RoleEnum;
    status: UserStatusEnum;
    bio?: string;
    avatarUrl?: string | null;
}
export declare const DEFAULT_SEED_PASSWORD = "Password123@";
export declare const USER_SEED_DATA: IUserSeedItem[];
