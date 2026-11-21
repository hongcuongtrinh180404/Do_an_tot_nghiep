import { CourseStatusEnum } from 'share-lib';
import { PaginationParamsDto } from '../../base/dto/pagination-params.dto.js';
export declare class QueryCoursesAdminDto extends PaginationParamsDto {
    search?: string;
    status?: CourseStatusEnum;
    categoryId?: string;
    instructorId?: string;
}
