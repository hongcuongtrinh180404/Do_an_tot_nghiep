import type { InstructorApplicationStatusEnum } from '../enums/instructor-application-status.enum.js';

export interface IInstructorApplication {
  id: string;
  userId: string;
  applicantName: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  expertises: string[];
  bio: string;
  experience: string;
  cvFileName?: string;
  cvFileUrl?: string;
  status: InstructorApplicationStatusEnum;
  rejectionReason?: string | null;
  reviewedById?: string | null;
  reviewedByName?: string | null;
  reviewedAt?: string | Date | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface IInstructorTerm {
  id: string;
  title: string;
  content: string;
  isMandatory: boolean;
  order: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface IAdminInstructorApplicationsStats {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  totalCount: number;
}
