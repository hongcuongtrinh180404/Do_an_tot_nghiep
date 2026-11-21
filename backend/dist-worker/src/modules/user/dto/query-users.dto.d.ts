import { RoleEnum, UserStatusEnum } from 'share-lib';
import { PaginationParamsDto } from '../../base/dto/pagination-params.dto.js';
export declare class QueryUsersDto extends PaginationParamsDto {
    search?: string;
    role?: RoleEnum;
    status?: UserStatusEnum;
}
