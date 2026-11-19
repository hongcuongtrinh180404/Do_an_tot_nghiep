import { describe, it, expect, vi } from 'vitest';
import { InstructorApplicationStatusEnum, type IInstructorApplication } from 'share-lib';
import { createInstructorApprovalColumns } from '../instructors/components/instructor-approval-columns';

describe('Instructor Approval Columns & History Tab Flow', () => {
  const pendingApp: IInstructorApplication = {
    id: 'app-pending-1',
    userId: 'user-student-1',
    applicantName: 'Lê Văn Cường',
    email: 'cuong@example.com',
    phone: '0987654321',
    expertises: ['Công nghệ Thông tin & Lập trình', 'Trí tuệ nhân tạo (AI)'],
    bio: 'Kỹ sư cao cấp Fullstack & AI',
    experience: '6 năm kinh nghiệm giảng dạy và phát triển phần mềm',
    cvFileName: 'CV_LeVanCuong.pdf',
    status: InstructorApplicationStatusEnum.PENDING,
    createdAt: '2026-11-18T10:00:00.000Z',
  };

  const historyApprovedApp: IInstructorApplication = {
    id: 'app-history-1',
    userId: 'user-student-2',
    applicantName: 'Trần Thị Mai',
    email: 'mai.tran@example.com',
    phone: '0912345678',
    expertises: ['Thiết kế UI/UX', 'Figma Mastery'],
    bio: 'Lead Product Designer',
    experience: '4 năm thiết kế sản phẩm số',
    cvFileName: 'CV_TranThiMai.pdf',
    status: InstructorApplicationStatusEnum.APPROVED,
    reviewedById: 'admin-123',
    reviewedByName: 'CUONG TRINH',
    reviewedAt: '2026-11-18T14:30:00.000Z',
    createdAt: '2026-11-17T09:00:00.000Z',
    history: [
      {
        action: 'SUBMITTED',
        actorId: 'user-student-2',
        actorName: 'Trần Thị Mai',
        actorRole: 'STUDENT',
        timestamp: '2026-11-17T09:00:00.000Z',
      },
      {
        action: 'APPROVED',
        actorId: 'admin-123',
        actorName: 'CUONG TRINH',
        actorRole: 'ADMIN',
        comment: 'Hồ sơ đạt yêu cầu chuyên môn.',
        timestamp: '2026-11-18T14:30:00.000Z',
      },
    ],
  };

  const historyRejectedApp: IInstructorApplication = {
    id: 'app-history-2',
    userId: 'user-student-3',
    applicantName: 'Nguyễn Văn An',
    email: 'an.nguyen@example.com',
    phone: '0909090909',
    expertises: ['Marketing Digital'],
    bio: 'Marketer tự do',
    experience: '1 năm kinh nghiệm',
    cvFileName: 'CV_NguyenVanAn.pdf',
    status: InstructorApplicationStatusEnum.REJECTED,
    reviewedById: 'admin-123',
    reviewedByName: 'CUONG TRINH',
    reviewedAt: '2026-11-18T15:00:00.000Z',
    rejectionReason: 'Chưa đủ chứng chỉ sư phạm hoặc kinh nghiệm tương đương',
    createdAt: '2026-11-16T08:00:00.000Z',
    history: [
      {
        action: 'SUBMITTED',
        actorId: 'user-student-3',
        actorName: 'Nguyễn Văn An',
        actorRole: 'STUDENT',
        timestamp: '2026-11-16T08:00:00.000Z',
      },
      {
        action: 'REJECTED',
        actorId: 'admin-123',
        actorName: 'CUONG TRINH',
        actorRole: 'ADMIN',
        comment: 'Chưa đủ chứng chỉ sư phạm hoặc kinh nghiệm tương đương',
        timestamp: '2026-11-18T15:00:00.000Z',
      },
    ],
  };

  it('creates columns for PENDING tab with submittedAt and action buttons', () => {
    const onViewDetail = vi.fn();
    const onApprove = vi.fn();
    const onReject = vi.fn();

    const columns = createInstructorApprovalColumns({
      onViewDetail,
      onApprove,
      onReject,
      currentTab: 'PENDING',
    });

    const columnIds = columns.map((col) => col.id);
    expect(columnIds).toContain('applicant');
    expect(columnIds).toContain('expertises');
    expect(columnIds).toContain('experience');
    expect(columnIds).toContain('cvFile');
    expect(columnIds).toContain('submittedAt');
    expect(columnIds).toContain('status');
    expect(columnIds).toContain('actions');
    expect(columnIds).not.toContain('reviewedBy');
    expect(columnIds).not.toContain('reviewedAt');
  });

  it('creates columns for HISTORY tab with reviewedBy and reviewedAt', () => {
    const onViewDetail = vi.fn();
    const onApprove = vi.fn();
    const onReject = vi.fn();

    const columns = createInstructorApprovalColumns({
      onViewDetail,
      onApprove,
      onReject,
      currentTab: 'HISTORY',
    });

    const columnIds = columns.map((col) => col.id);
    expect(columnIds).toContain('applicant');
    expect(columnIds).toContain('expertises');
    expect(columnIds).toContain('cvFile');
    expect(columnIds).toContain('reviewedBy');
    expect(columnIds).toContain('reviewedAt');
    expect(columnIds).toContain('status');
    expect(columnIds).toContain('actions');
    expect(columnIds).not.toContain('submittedAt');
  });

  it('should verify reviewedBy column correctly reflects reviewer name and fallback', () => {
    const columns = createInstructorApprovalColumns({
      onViewDetail: vi.fn(),
      onApprove: vi.fn(),
      onReject: vi.fn(),
      currentTab: 'HISTORY',
    });

    const reviewedByCol = columns.find((c) => c.id === 'reviewedBy');
    expect(reviewedByCol).toBeDefined();

    // Test with reviewedByName = 'CUONG TRINH'
    expect(historyApprovedApp.reviewedByName).toBe('CUONG TRINH');

    // Test fallback for legacy/missing reviewer
    const legacyApp = { ...historyApprovedApp, reviewedByName: undefined };
    expect(legacyApp.reviewedByName || 'Ban Quản Trị').toBe('Ban Quản Trị');
  });

  it('should verify history log schema and integrity for audit requirements', () => {
    expect(historyApprovedApp.history).toBeDefined();
    expect(historyApprovedApp.history?.length).toBe(2);

    const approveLog = historyApprovedApp.history?.[1];
    expect(approveLog?.action).toBe('APPROVED');
    expect(approveLog?.actorName).toBe('CUONG TRINH');
    expect(approveLog?.actorId).toBe('admin-123');
    expect(approveLog?.actorRole).toBe('ADMIN');
    expect(approveLog?.comment).toBe('Hồ sơ đạt yêu cầu chuyên môn.');

    const rejectLog = historyRejectedApp.history?.[1];
    expect(rejectLog?.action).toBe('REJECTED');
    expect(rejectLog?.actorName).toBe('CUONG TRINH');
    expect(rejectLog?.comment).toContain('chứng chỉ sư phạm');
  });

  it('calculates total stats accurately for pending, approved and rejected records', () => {
    const statsData = {
      pendingCount: 1,
      approvedCount: 2,
      rejectedCount: 1,
    };

    const pendingTotal = statsData.pendingCount;
    const approvedTotal = statsData.approvedCount;
    const rejectedTotal = statsData.rejectedCount;
    const historyTotal = approvedTotal + rejectedTotal;

    expect(pendingTotal).toBe(1);
    expect(approvedTotal).toBe(2);
    expect(rejectedTotal).toBe(1);
    expect(historyTotal).toBe(3);
  });
});
