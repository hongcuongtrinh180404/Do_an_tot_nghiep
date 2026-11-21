import { InstructorApplicationStatusEnum } from 'share-lib';
import { PaginationParamsDto } from '../../base/index.js';
export declare enum InstructorApplicationTabEnum {
    PENDING = "PENDING",
    HISTORY = "HISTORY"
}
export declare class QueryInstructorApplicationsDto extends PaginationParamsDto {
    tab?: InstructorApplicationTabEnum;
    status?: InstructorApplicationStatusEnum;
    search?: string;
}
