export type EnrolledCourseStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
export type PaymentStatus = 'PAID' | 'REFUNDED';

export interface EnrolledCourseItem {
  id: string;
  courseId: string;
  title: string;
  thumbnailUrl: string;
  purchaseDate: string; // ISO date string hoặc ngày định dạng
  price: number;
  paymentStatus: PaymentStatus;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number; // 0 - 100
  status: EnrolledCourseStatus;
}

export const MOCK_ENROLLED_COURSES: EnrolledCourseItem[] = [
  {
    id: 'enroll-001',
    courseId: 'course-nestjs-01',
    title: 'Lập trình Backend chuyên sâu với NestJS & MongoDB',
    thumbnailUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=320&auto=format&fit=crop&q=80',
    purchaseDate: '2026-10-12T08:30:00.000Z',
    price: 799000,
    paymentStatus: 'PAID',
    totalLessons: 28,
    completedLessons: 18,
    progressPercent: 65,
    status: 'IN_PROGRESS',
  },
  {
    id: 'enroll-002',
    courseId: 'course-react-02',
    title: 'Xây dựng Web App tương tác cao với React 19, Next.js & Tailwind CSS',
    thumbnailUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=320&auto=format&fit=crop&q=80',
    purchaseDate: '2026-09-05T14:15:00.000Z',
    price: 1250000,
    paymentStatus: 'PAID',
    totalLessons: 42,
    completedLessons: 42,
    progressPercent: 100,
    status: 'COMPLETED',
  },
  {
    id: 'enroll-003',
    courseId: 'course-ai-video-03',
    title: 'Pipeline Xử Lý Video AI với RabbitMQ, AssemblyAI & Gemini Multimodal',
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=320&auto=format&fit=crop&q=80',
    purchaseDate: '2026-10-20T19:45:00.000Z',
    price: 1490000,
    paymentStatus: 'PAID',
    totalLessons: 20,
    completedLessons: 0,
    progressPercent: 0,
    status: 'NOT_STARTED',
  },
];
