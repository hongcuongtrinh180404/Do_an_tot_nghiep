import { PaginationParamsDto } from '../../base/dto/pagination-params.dto.js';
export declare class AdminQueryReviewsDto extends PaginationParamsDto {
    search?: string;
    status?: string;
    rating?: number;
    courseId?: string;
    hasReports?: boolean;
    startDate?: string;
    endDate?: string;
}
