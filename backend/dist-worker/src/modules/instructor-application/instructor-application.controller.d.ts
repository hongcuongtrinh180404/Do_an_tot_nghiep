import { type IInstructorApplication, type IInstructorTerm, type IAdminInstructorApplicationsStats } from 'share-lib';
import { ApiResponse, PaginationResult } from '../base/index.js';
import { InstructorApplicationService } from './services/instructor-application.service.js';
import { QueryInstructorApplicationsDto } from './dto/query-instructor-applications.dto.js';
import { RejectInstructorApplicationDto } from './dto/reject-instructor-application.dto.js';
import { UpdateInstructorTermsDto } from './dto/update-instructor-terms.dto.js';
import { ApplyInstructorApplicationDto } from './dto/apply-instructor-application.dto.js';
export declare class InstructorApplicationController {
    private readonly instructorApplicationService;
    constructor(instructorApplicationService: InstructorApplicationService);
    getApplications(query: QueryInstructorApplicationsDto): Promise<ApiResponse<PaginationResult<IInstructorApplication>>>;
    getPendingCount(): Promise<ApiResponse<{
        pendingCount: number;
    }>>;
    getStats(): Promise<ApiResponse<IAdminInstructorApplicationsStats>>;
    getApplicationDetail(id: string): Promise<ApiResponse<IInstructorApplication>>;
    approveApplication(id: string, adminId: string, adminName: string): Promise<ApiResponse<IInstructorApplication>>;
    rejectApplication(id: string, adminId: string, adminName: string, dto: RejectInstructorApplicationDto): Promise<ApiResponse<IInstructorApplication>>;
}
export declare class InstructorTermsController {
    private readonly instructorApplicationService;
    constructor(instructorApplicationService: InstructorApplicationService);
    getTerms(): Promise<ApiResponse<IInstructorTerm[]>>;
    updateTerms(dto: UpdateInstructorTermsDto): Promise<ApiResponse<IInstructorTerm[]>>;
}
export declare class InstructorApplicationUserController {
    private readonly instructorApplicationService;
    constructor(instructorApplicationService: InstructorApplicationService);
    getTerms(): Promise<ApiResponse<IInstructorTerm[]>>;
    apply(userId: string, userEmail: string, userName: string, dto: ApplyInstructorApplicationDto): Promise<ApiResponse<IInstructorApplication>>;
    getMyApplication(userId: string): Promise<ApiResponse<IInstructorApplication | null>>;
}
