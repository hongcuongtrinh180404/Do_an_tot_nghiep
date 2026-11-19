import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import {
  InstructorApplicationStatusEnum,
  RoleEnum,
  type IInstructorApplication,
  type IInstructorTerm,
} from 'share-lib';
import { InstructorApplicationService } from '../services/instructor-application.service.js';
import { QueryInstructorApplicationsDto } from '../dto/query-instructor-applications.dto.js';
import type { InstructorApplicationRepository } from '../repositories/instructor-application.repository.js';
import type { InstructorTermRepository } from '../repositories/instructor-term.repository.js';
import type { UserRepository } from '../../user/repositories/user.repository.js';

describe('InstructorApplicationService', () => {
  let service: InstructorApplicationService;
  let mockAppRepo: Partial<Record<keyof InstructorApplicationRepository, ReturnType<typeof vi.fn>>>;
  let mockTermRepo: Partial<Record<keyof InstructorTermRepository, ReturnType<typeof vi.fn>>>;
  let mockUserRepo: Partial<Record<keyof UserRepository, ReturnType<typeof vi.fn>>>;
  let mockCls: Partial<Record<keyof ClsService, ReturnType<typeof vi.fn>>>;

  const sampleApplication: IInstructorApplication = {
    id: 'app-1',
    userId: '507f1f77bcf86cd799439011',
    applicantName: 'Nguyen Van A',
    email: 'vana@example.com',
    phone: '0901234567',
    expertises: ['Công nghệ Thông tin & Lập trình'],
    bio: 'Software engineer with 5 years experience',
    experience: '3 years teaching experience',
    status: InstructorApplicationStatusEnum.PENDING,
    createdAt: new Date().toISOString(),
  };

  const sampleTerms: IInstructorTerm[] = [
    {
      id: 'term-1',
      title: 'Bản quyền nội dung',
      content: 'Cam kết bản quyền bài giảng',
      isMandatory: true,
      order: 1,
    },
  ];

  beforeEach(() => {
    mockAppRepo = {
      findApplicationsWithFilter: vi.fn(),
      countPending: vi.fn(),
      getStats: vi.fn(),
      findById: vi.fn(),
      findByUserId: vi.fn(),
      updateStatus: vi.fn(),
      createWithHistory: vi.fn(),
      resubmitApplication: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
    };

    mockTermRepo = {
      findAllOrdered: vi.fn(),
      replaceAllTerms: vi.fn(),
    };

    mockUserRepo = {
      update: vi.fn(),
      findByEmail: vi.fn(),
    };

    mockCls = {
      get: vi.fn().mockReturnValue('mock-correlation-id'),
    };

    service = new InstructorApplicationService(
      mockAppRepo as unknown as InstructorApplicationRepository,
      mockTermRepo as unknown as InstructorTermRepository,
      mockUserRepo as unknown as UserRepository,
      mockCls as unknown as ClsService,
    );
  });

  describe('getApplications', () => {
    it('should return paginated list from repository', async () => {
      const mockResult = {
        items: [sampleApplication],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      };
      mockAppRepo.findApplicationsWithFilter!.mockResolvedValue(mockResult);

      const queryDto = Object.assign(new QueryInstructorApplicationsDto(), {
        page: 1,
        limit: 10,
        isPagination: true,
      });
      const result = await service.getApplications(queryDto);
      expect(result).toEqual(mockResult);
      expect(mockAppRepo.findApplicationsWithFilter).toHaveBeenCalledWith(queryDto);
    });
  });

  describe('getPendingCount', () => {
    it('should return pendingCount object', async () => {
      mockAppRepo.countPending!.mockResolvedValue(5);
      const result = await service.getPendingCount();
      expect(result).toEqual({ pendingCount: 5 });
    });
  });

  describe('getApplicationDetail', () => {
    it('should return application if found', async () => {
      mockAppRepo.findById!.mockResolvedValue(sampleApplication);
      const result = await service.getApplicationDetail('app-1');
      expect(result).toEqual(sampleApplication);
    });

    it('should throw NotFoundException if not found', async () => {
      mockAppRepo.findById!.mockResolvedValue(null);
      await expect(service.getApplicationDetail('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('approveApplication', () => {
    it('should approve pending application and promote user role to INSTRUCTOR', async () => {
      mockAppRepo.findById!.mockResolvedValue(sampleApplication);
      const approvedApp: IInstructorApplication = {
        ...sampleApplication,
        status: InstructorApplicationStatusEnum.APPROVED,
        reviewedByName: 'Admin',
      };
      mockAppRepo.updateStatus!.mockResolvedValue(approvedApp);
      mockUserRepo.update!.mockResolvedValue({});

      const result = await service.approveApplication('app-1', 'admin-id-1', 'Admin');

      expect(mockAppRepo.updateStatus).toHaveBeenCalledWith(
        'app-1',
        InstructorApplicationStatusEnum.APPROVED,
        expect.objectContaining({
          reviewedByName: 'Admin',
        }),
        expect.objectContaining({
          action: 'APPROVED',
          actorName: 'Admin',
          actorRole: RoleEnum.ADMIN,
        }),
      );
      expect(mockUserRepo.update).toHaveBeenCalledWith('507f1f77bcf86cd799439011', {
        role: RoleEnum.INSTRUCTOR,
      });
      expect(result.status).toBe(InstructorApplicationStatusEnum.APPROVED);
    });

    it('should throw BadRequestException if already approved', async () => {
      mockAppRepo.findById!.mockResolvedValue({
        ...sampleApplication,
        status: InstructorApplicationStatusEnum.APPROVED,
      });

      await expect(
        service.approveApplication('app-1', 'admin-id-1', 'Admin'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if application does not exist', async () => {
      mockAppRepo.findById!.mockResolvedValue(null);

      await expect(
        service.approveApplication('non-existent', 'admin-id-1', 'Admin'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('rejectApplication', () => {
    it('should reject application with reason', async () => {
      mockAppRepo.findById!.mockResolvedValue(sampleApplication);
      const rejectedApp: IInstructorApplication = {
        ...sampleApplication,
        status: InstructorApplicationStatusEnum.REJECTED,
        rejectionReason: 'Hồ sơ chưa đạt tiêu chuẩn số năm kinh nghiệm',
      };
      mockAppRepo.updateStatus!.mockResolvedValue(rejectedApp);

      const result = await service.rejectApplication(
        'app-1',
        'admin-id-1',
        'Admin',
        'Hồ sơ chưa đạt tiêu chuẩn số năm kinh nghiệm',
      );

      expect(mockAppRepo.updateStatus).toHaveBeenCalledWith(
        'app-1',
        InstructorApplicationStatusEnum.REJECTED,
        expect.objectContaining({
          rejectionReason: 'Hồ sơ chưa đạt tiêu chuẩn số năm kinh nghiệm',
        }),
        expect.objectContaining({
          action: 'REJECTED',
          actorName: 'Admin',
          actorRole: RoleEnum.ADMIN,
          comment: 'Hồ sơ chưa đạt tiêu chuẩn số năm kinh nghiệm',
        }),
      );
      expect(result.status).toBe(InstructorApplicationStatusEnum.REJECTED);
    });

    it('should throw BadRequestException if rejection reason is shorter than 10 characters', async () => {
      await expect(
        service.rejectApplication('app-1', 'admin-id-1', 'Admin', 'quá ngắn'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if already rejected', async () => {
      mockAppRepo.findById!.mockResolvedValue({
        ...sampleApplication,
        status: InstructorApplicationStatusEnum.REJECTED,
      });

      await expect(
        service.rejectApplication(
          'app-1',
          'admin-id-1',
          'Admin',
          'Lý do từ chối hợp lệ dài hơn 10 ký tự',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('terms operations', () => {
    it('should return all terms ordered', async () => {
      mockTermRepo.findAllOrdered!.mockResolvedValue(sampleTerms);
      const result = await service.getTerms();
      expect(result).toEqual(sampleTerms);
    });

    it('should update terms', async () => {
      mockTermRepo.replaceAllTerms!.mockResolvedValue(sampleTerms);
      const result = await service.updateTerms({ terms: sampleTerms });
      expect(result).toEqual(sampleTerms);
    });
  });

  describe('applyOrResubmitApplication & getMyApplication', () => {
    const validDto = {
      phone: '0912345678',
      expertises: ['Công nghệ Thông tin & Lập trình'],
      bio: 'Tiểu sử giảng dạy chuyên nghiệp trên 5 năm',
      experience: 'Kinh nghiệm giảng dạy thực tế hơn 3 năm',
      cvFileName: 'cv.pdf',
    };

    it('should create new application with SUBMITTED history if first time', async () => {
      mockAppRepo.findByUserId!.mockResolvedValue(null);
      mockAppRepo.createWithHistory!.mockResolvedValue({
        ...sampleApplication,
        status: InstructorApplicationStatusEnum.PENDING,
      });

      const result = await service.applyOrResubmitApplication(
        '507f1f77bcf86cd799439011',
        'vana@example.com',
        'Nguyen Van A',
        validDto,
      );

      expect(mockAppRepo.createWithHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          applicantName: 'Nguyen Van A',
          email: 'vana@example.com',
          phone: '0912345678',
          status: InstructorApplicationStatusEnum.PENDING,
        }),
        expect.objectContaining({
          action: 'SUBMITTED',
          actorName: 'Nguyen Van A',
          actorRole: RoleEnum.STUDENT,
        }),
      );
      expect(result.status).toBe(InstructorApplicationStatusEnum.PENDING);
    });

    it('should throw BadRequestException if user already has PENDING application', async () => {
      mockAppRepo.findByUserId!.mockResolvedValue({
        ...sampleApplication,
        status: InstructorApplicationStatusEnum.PENDING,
      });

      await expect(
        service.applyOrResubmitApplication(
          '507f1f77bcf86cd799439011',
          'vana@example.com',
          'Nguyen Van A',
          validDto,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if user is already APPROVED', async () => {
      mockAppRepo.findByUserId!.mockResolvedValue({
        ...sampleApplication,
        status: InstructorApplicationStatusEnum.APPROVED,
      });

      await expect(
        service.applyOrResubmitApplication(
          '507f1f77bcf86cd799439011',
          'vana@example.com',
          'Nguyen Van A',
          validDto,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow resubmit if previous application was REJECTED', async () => {
      mockAppRepo.findByUserId!.mockResolvedValue({
        ...sampleApplication,
        id: 'app-rejected-1',
        status: InstructorApplicationStatusEnum.REJECTED,
      });
      mockAppRepo.resubmitApplication!.mockResolvedValue({
        ...sampleApplication,
        id: 'app-rejected-1',
        status: InstructorApplicationStatusEnum.PENDING,
      });

      const result = await service.applyOrResubmitApplication(
        '507f1f77bcf86cd799439011',
        'vana@example.com',
        'Nguyen Van A',
        validDto,
      );

      expect(mockAppRepo.resubmitApplication).toHaveBeenCalledWith(
        'app-rejected-1',
        expect.objectContaining({
          phone: '0912345678',
        }),
        expect.objectContaining({
          action: 'RESUBMITTED',
          actorName: 'Nguyen Van A',
          actorRole: RoleEnum.STUDENT,
        }),
      );
      expect(result.status).toBe(InstructorApplicationStatusEnum.PENDING);
    });

    it('should return my application by userId', async () => {
      mockAppRepo.findByUserId!.mockResolvedValue(sampleApplication);
      const result = await service.getMyApplication('507f1f77bcf86cd799439011');
      expect(result).toEqual(sampleApplication);
    });
  });
});
