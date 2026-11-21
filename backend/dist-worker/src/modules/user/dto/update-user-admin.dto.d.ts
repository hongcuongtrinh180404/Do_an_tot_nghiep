import { RoleEnum, UserStatusEnum } from 'share-lib';
export declare class UpdateUserAdminDto {
    fullName?: string;
    bio?: string;
    role?: RoleEnum;
    status?: UserStatusEnum;
}
