export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type TeachingCourseStatus = 'PUBLISHED' | 'DRAFT' | 'PENDING_APPROVAL';

export interface InstructorStats {
  totalCourses: number;
  totalStudents: number;
  totalRevenue: number;
  netRevenue: number; // Hoa hồng thực nhận
  averageRating: number;
  totalReviews: number;
}

export interface InstructorTeachingCourse {
  id: string;
  title: string;
  thumbnailUrl: string;
  price: number;
  level: CourseLevel;
  studentCount: number;
  revenue: number;
  rating: number;
  reviewCount: number;
  status: TeachingCourseStatus;
  updatedAt: string;
}

export const MOCK_INSTRUCTOR_STATS: InstructorStats = {
  totalCourses: 5,
  totalStudents: 1420,
  totalRevenue: 86500000,
  netRevenue: 60550000,
  averageRating: 4.8,
  totalReviews: 320,
};

export const MOCK_INSTRUCTOR_COURSES: InstructorTeachingCourse[] = [
  {
    id: 'course-inst-01',
    title: 'Lập trình Backend chuyên sâu với NestJS, MongoDB & Microservices',
    thumbnailUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=320&auto=format&fit=crop&q=80',
    price: 799000,
    level: 'ADVANCED',
    studentCount: 650,
    revenue: 41548000,
    rating: 4.9,
    reviewCount: 145,
    status: 'PUBLISHED',
    updatedAt: '2026-10-18T10:00:00.000Z',
  },
  {
    id: 'course-inst-02',
    title: 'Xây dựng Web App tương tác cao với React 19, Next.js & Tailwind CSS',
    thumbnailUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=320&auto=format&fit=crop&q=80',
    price: 1250000,
    level: 'INTERMEDIATE',
    studentCount: 480,
    revenue: 30000000,
    rating: 4.8,
    reviewCount: 110,
    status: 'PUBLISHED',
    updatedAt: '2026-09-25T14:30:00.000Z',
  },
  {
    id: 'course-inst-03',
    title: 'Pipeline Xử Lý Video AI với RabbitMQ, AssemblyAI & Gemini Multimodal',
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=320&auto=format&fit=crop&q=80',
    price: 1490000,
    level: 'ADVANCED',
    studentCount: 190,
    revenue: 14952000,
    rating: 4.7,
    reviewCount: 45,
    status: 'PUBLISHED',
    updatedAt: '2026-10-22T08:15:00.000Z',
  },
  {
    id: 'course-inst-04',
    title: 'Kiến trúc Clean Architecture & Domain-Driven Design trong NodeJS',
    thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=320&auto=format&fit=crop&q=80',
    price: 650000,
    level: 'ADVANCED',
    studentCount: 100,
    revenue: 0,
    rating: 5.0,
    reviewCount: 20,
    status: 'PENDING_APPROVAL',
    updatedAt: '2026-10-24T16:00:00.000Z',
  },
  {
    id: 'course-inst-05',
    title: 'TypeScript Masterclass: Từ Cơ Bản Đến Generic Nâng Cao',
    thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=320&auto=format&fit=crop&q=80',
    price: 499000,
    level: 'BEGINNER',
    studentCount: 0,
    revenue: 0,
    rating: 0,
    reviewCount: 0,
    status: 'DRAFT',
    updatedAt: '2026-10-25T07:20:00.000Z',
  },
];
