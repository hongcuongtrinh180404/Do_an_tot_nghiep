import { CourseApprovalActionEnum } from 'share-lib';
import { PaginationParamsDto } from '../../base/index.js';
export declare class QueryCourseApprovalHistoryDto extends PaginationParamsDto {
    action?: CourseApprovalActionEnum;
    courseId?: string;
    search?: string;
}
