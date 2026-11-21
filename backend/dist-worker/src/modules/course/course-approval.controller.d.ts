import { type ICourse, type ICourseApprovalChecklist, RoleEnum } from 'share-lib';
import { ApiResponse } from '../base/index.js';
import { CourseApprovalService } from './services/course-approval.service.js';
export declare class CourseApprovalController {
    private readonly approvalService;
    constructor(approvalService: CourseApprovalService);
    getChecklist(id: string, userId: string, role: RoleEnum): Promise<ApiResponse<ICourseApprovalChecklist>>;
    requestApproval(id: string, userId: string, role: RoleEnum): Promise<ApiResponse<ICourse>>;
    cancelApproval(id: string, userId: string, role: RoleEnum): Promise<ApiResponse<ICourse>>;
    withdrawApproval(id: string, userId: string, role: RoleEnum): Promise<ApiResponse<ICourse>>;
}
