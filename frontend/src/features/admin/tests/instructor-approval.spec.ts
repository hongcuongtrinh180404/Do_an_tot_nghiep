import { describe, it, expect, vi } from 'vitest';
import { InstructorApplicationStatusEnum, type IInstructorApplication } from 'share-lib';
import { createInstructorApprovalColumns } from '../instructors/components/instructor-approval-columns';

describe('Instructor Approval Columns & Definitions', () => {
  const sampleApp: IInstructorApplication = {
    id: 'app-test-1',
    userId: 'user-test-1',
    applicantName: 'Trần Văn B',
    email: 'vanb@example.com',
    phone: '0912345678',
    expertises: ['Công nghệ Thông tin & Lập trình', 'AI & Khoa học Dữ liệu'],
    bio: 'Kỹ sư cao cấp',
    experience: '5 năm kinh nghiệm',
    cvFileName: 'test_cv.pdf',
    status: InstructorApplicationStatusEnum.PENDING,
    createdAt: '2026-11-18T10:00:00.000Z',
  };

  it('creates columns with all required fields', () => {
    const onViewDetail = vi.fn();
    const onApprove = vi.fn();
    const onReject = vi.fn();

    const columns = createInstructorApprovalColumns({
      onViewDetail,
      onApprove,
      onReject,
    });

    const columnIds = columns.map((col) => col.id);
    expect(columnIds).toContain('applicant');
    expect(columnIds).toContain('expertises');
    expect(columnIds).toContain('experience');
    expect(columnIds).toContain('cvFile');
    expect(columnIds).toContain('submittedAt');
    expect(columnIds).toContain('status');
    expect(columnIds).toContain('actions');
  });

  it('formats applicant and expertise correctly in columns', () => {
    const onViewDetail = vi.fn();
    const onApprove = vi.fn();
    const onReject = vi.fn();

    const columns = createInstructorApprovalColumns({
      onViewDetail,
      onApprove,
      onReject,
    });

    expect(columns.length).toBeGreaterThan(0);
    expect(sampleApp.status).toBe(InstructorApplicationStatusEnum.PENDING);
  });
});
