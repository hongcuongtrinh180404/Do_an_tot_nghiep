import { type IUserProfile, type IPublicUserProfile } from 'share-lib';
import { ApiResponse, PaginationResult } from '../base/index.js';
import { UserService } from './services/user.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { QueryUsersDto } from './dto/query-users.dto.js';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto.js';
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    getUsers(query: QueryUsersDto): Promise<ApiResponse<PaginationResult<IUserProfile>>>;
    getProfile(userId: string): Promise<ApiResponse<IUserProfile>>;
    updateProfile(userId: string, dto: UpdateProfileDto): Promise<ApiResponse<IUserProfile>>;
    uploadAvatar(userId: string, file: Express.Multer.File): Promise<ApiResponse<{
        avatar: string;
        user: IUserProfile;
    }>>;
    getPublicProfile(username: string): Promise<ApiResponse<IPublicUserProfile>>;
    getUserDetail(userId: string): Promise<ApiResponse<IUserProfile>>;
    updateUserAdmin(userId: string, dto: UpdateUserAdminDto): Promise<ApiResponse<IUserProfile>>;
    deleteUser(userId: string): Promise<ApiResponse<{
        deleted: boolean;
    }>>;
}
