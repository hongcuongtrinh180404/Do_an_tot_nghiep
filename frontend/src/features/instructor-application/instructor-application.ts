export const BECOME_INSTRUCTOR_PATH = '/become-instructor';

export type InstructorApplicationStatus = 'not-applied' | 'pending' | 'rejected';

export interface InstructorApplication {
  status: InstructorApplicationStatus;
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export const INSTRUCTOR_APPLICATION_LABELS: Record<InstructorApplicationStatus, string> = {
  'not-applied': 'Trở thành giảng viên',
  pending: 'Xem trạng thái đăng ký',
  rejected: 'Xem kết quả / Đăng ký lại',
};

/**
 * UI fixtures only. No application endpoint exists yet. Preview parameters must
 * never be interpreted as account data or enable capabilities in production.
 */
export function getApplicationPreview(
  value: string | null,
  enabled: boolean,
): InstructorApplication | null {
  if (!enabled) return null;
  switch (value) {
    case 'not-applied':
      return { status: 'not-applied' };
    case 'pending':
      return { status: 'pending', submittedAt: '2026-11-16T08:30:00+07:00' };
    case 'rejected':
      return {
        status: 'rejected',
        submittedAt: '2026-11-14T09:00:00+07:00',
        reviewedAt: '2026-11-16T14:15:00+07:00',
        rejectionReason:
          'Vui lòng làm rõ chuyên môn và nội dung bạn dự định giảng dạy để Admin có thêm cơ sở xem xét yêu cầu.',
      };
    default:
      return null;
  }
}
