export const BECOME_INSTRUCTOR_PATH = '/become-instructor';

export type InstructorApplicationStatus = 'not-applied' | 'pending' | 'rejected';

export interface InstructorApplication {
  status: InstructorApplicationStatus;
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  applicantData?: {
    fullName: string;
    email: string;
    phone: string;
    expertises: string[];
    bio: string;
    experience: string;
    cvFileName?: string;
  };
}

export const INSTRUCTOR_APPLICATION_LABELS: Record<InstructorApplicationStatus, string> = {
  'not-applied': 'Trở thành giảng viên',
  pending: 'Xem trạng thái đăng ký',
  rejected: 'Xem kết quả / Đăng ký lại',
};

export const INSTRUCTOR_EXPERTISE_OPTIONS = [
  'Lập trình & Kỹ thuật phần mềm',
  'Trí tuệ nhân tạo & Khoa học dữ liệu',
  'Thiết kế UI/UX & Sản phẩm',
  'Kinh doanh số & Khởi nghiệp',
  'Ngoại ngữ & Kỹ năng học tập',
  'Marketing số & Truyền thông',
  'Quản trị dự án & Agile',
  'Kỹ năng mềm & Phát triển cá nhân',
] as const;

export const INSTRUCTOR_TERMS_MOCK = [
  'Giảng viên cam kết sở hữu bản quyền hoặc có quyền hợp pháp đối với toàn bộ nội dung, bài giảng video, sơ đồ tư duy và tài liệu được phát hành trên nền tảng Mindly.',
  'Giảng viên đồng ý tuân thủ tiêu chuẩn chất lượng sư phạm của Mindly và phối hợp cùng ban quản trị trong quá trình xét duyệt, hoàn thiện học liệu.',
  'Mindly cam kết bảo mật hồ sơ chuyên môn của ứng viên và thực hiện chính sách đối soát, chi trả doanh thu minh bạch theo thỏa thuận hợp tác giảng dạy.',
] as const;

export const MAX_CV_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const ALLOWED_CV_EXTENSIONS = ['.pdf', '.doc', '.docx'];
export const ALLOWED_CV_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

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
      return {
        status: 'pending',
        submittedAt: '2026-11-16T08:30:00+07:00',
        applicantData: {
          fullName: 'Nguyễn Văn Minh',
          email: 'minh.nguyen@example.com',
          phone: '0912 345 678',
          expertises: ['Lập trình & Kỹ thuật phần mềm', 'Trí tuệ nhân tạo & Khoa học dữ liệu'],
          bio: 'Kỹ sư phần mềm cao cấp với 6 năm kinh nghiệm phát triển hệ thống phân tán và kiến trúc microservices.',
          experience: 'Đã từng hướng dẫn và đào tạo hơn 500 học viên qua các workshop nội bộ và khóa học lập trình trực tuyến.',
          cvFileName: 'NguyenVanMinh_SeniorSoftwareEngineer_CV.pdf',
        },
      };
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
