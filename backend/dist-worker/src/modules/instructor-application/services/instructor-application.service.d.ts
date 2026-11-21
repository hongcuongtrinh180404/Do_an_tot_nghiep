import { OnModuleInit } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { IInstructorApplication, IInstructorTerm, type IAdminInstructorApplicationsStats } from 'share-lib';
import { BaseService, PaginationResult } from '../../base/index.js';
import { InstructorApplicationRepository } from '../repositories/instructor-application.repository.js';
import { InstructorTermRepository } from '../repositories/instructor-term.repository.js';
import { UserRepository } from '../../user/repositories/user.repository.js';
import { QueryInstructorApplicationsDto } from '../dto/query-instructor-applications.dto.js';
import { UpdateInstructorTermsDto } from '../dto/update-instructor-terms.dto.js';
import { ApplyInstructorApplicationDto } from '../dto/apply-instructor-application.dto.js';
export declare const DEFAULT_INSTRUCTOR_TERMS: {
    title: string;
    content: string;
    isMandatory: boolean;
    order: number;
}[];
export declare class InstructorApplicationService extends BaseService<IInstructorApplication, string> implements OnModuleInit {
    private readonly applicationRepository;
    private readonly termRepository;
    private readonly userRepository;
    constructor(applicationRepository: InstructorApplicationRepository, termRepository: InstructorTermRepository, userRepository: UserRepository, cls: ClsService);
    onModuleInit(): Promise<void>;
    getApplications(queryDto: QueryInstructorApplicationsDto): Promise<PaginationResult<IInstructorApplication>>;
    getPendingCount(): Promise<{
        pendingCount: number;
    }>;
    getStats(): Promise<IAdminInstructorApplicationsStats>;
    getApplicationDetail(id: string): Promise<IInstructorApplication>;
    approveApplication(id: string, adminId: string, adminName: string): Promise<IInstructorApplication>;
    rejectApplication(id: string, adminId: string, adminName: string, rejectionReason: string): Promise<IInstructorApplication>;
    applyOrResubmitApplication(userId: string, userEmail: string, userName: string, dto: ApplyInstructorApplicationDto): Promise<IInstructorApplication>;
    getMyApplication(userId: string): Promise<IInstructorApplication | null>;
    getTerms(): Promise<IInstructorTerm[]>;
    updateTerms(dto: UpdateInstructorTermsDto): Promise<IInstructorTerm[]>;
    seedInitialDataIfEmpty(): Promise<void>;
}
