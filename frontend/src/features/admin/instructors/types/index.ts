import {
  InstructorApplicationStatusEnum,
  type IInstructorApplication,
  type IInstructorTerm,
  type IAdminInstructorApplicationsStats,
} from 'share-lib';

export {
  InstructorApplicationStatusEnum,
  type IInstructorApplication,
  type IInstructorTerm,
  type IAdminInstructorApplicationsStats,
};

export type InstructorApprovalTabType = 'PENDING' | 'HISTORY';

export interface AdminInstructorApplicationsQueryParams {
  page?: number;
  limit?: number;
  tab?: InstructorApprovalTabType;
  status?: InstructorApplicationStatusEnum | string;
  search?: string;
  sort?: string;
}

export interface RejectInstructorApplicationPayload {
  rejectionReason: string;
}

export interface UpdateInstructorTermsPayload {
  terms: Array<{
    id?: string;
    title: string;
    content: string;
    isMandatory?: boolean;
    order?: number;
  }>;
}
