import { CourseLevelEnum, CourseStatusEnum, type ICourse } from 'share-lib';

export interface IPublicCourseCard extends ICourse {
  instructorName: string;
  instructorTitle: string;
  instructorAvatar: string;
  rating: number;
  reviewCount: number;
  studentCount: number;
  durationFormatted: string;
  lessonsCount: number;
  categorySlug: string;
  categoryName: string;
  isFeatured?: boolean;
  aiFeatures: {
    hasMindmap: boolean;
    hasInVideoQuiz: boolean;
    hasTranscript: boolean;
  };
}

export interface ICourseCategory {
  id: string;
  name: string;
  slug: string;
  courseCount: number;
  iconName: string;
}

export const COURSE_CATEGORIES: ICourseCategory[] = [
  { id: 'cat-all', name: 'Tất cả lĩnh vực', slug: 'all', courseCount: 48, iconName: 'lucide:sparkles' },
  { id: 'cat-dev', name: 'Lập trình & Kỹ thuật', slug: 'lap-trinh', courseCount: 16, iconName: 'lucide:code-2' },
  { id: 'cat-ai', name: 'AI & Khoa học Dữ liệu', slug: 'ai-data', courseCount: 12, iconName: 'lucide:cpu' },
  { id: 'cat-design', name: 'Thiết kế UI/UX & Đồ họa', slug: 'thiet-ke', courseCount: 9, iconName: 'lucide:palette' },
  { id: 'cat-video', name: 'Dựng Video & Đa phương tiện', slug: 'dung-video', courseCount: 6, iconName: 'lucide:film' },
  { id: 'cat-biz', name: 'Kinh doanh & Marketing số', slug: 'kinh-doanh', courseCount: 5, iconName: 'lucide:trending-up' },
];

export const MOCK_PUBLIC_COURSES: IPublicCourseCard[] = [
  {
    id: 'course-nextjs-ai',
    title: 'Kiến trúc Next.js App Router Chuyên sâu & Tích hợp AI',
    slug: 'kien-truc-nextjs-app-router-chuyen-sau',
    shortDescription: 'Xây dựng web app fullstack hiệu năng cao với Server Components, TanStack Query và Gemini AI pipeline.',
    description: 'Khóa học cung cấp kiến thức nền tảng và thực chiến về Next.js App Router, quản lý state server-side và tích hợp AI.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
    trailerUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    price: 349000,
    originalPrice: 699000,
    instructorId: 'inst-1',
    instructorName: 'Trần Minh Khang',
    instructorTitle: 'Senior Frontend Architect',
    instructorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
    status: CourseStatusEnum.PUBLISHED,
    level: CourseLevelEnum.INTERMEDIATE,
    rating: 4.9,
    reviewCount: 342,
    studentCount: 1820,
    durationFormatted: '4h 15m',
    lessonsCount: 32,
    categorySlug: 'lap-trinh',
    categoryName: 'Lập trình & Kỹ thuật',
    isFeatured: true,
    aiFeatures: {
      hasMindmap: true,
      hasInVideoQuiz: true,
      hasTranscript: true,
    },
    createdAt: '2026-02-15T08:00:00.000Z',
    updatedAt: '2026-02-20T10:00:00.000Z',
  },
  {
    id: 'course-gemini-pipeline',
    title: 'Xây dựng AI Video Pipeline với AssemblyAI và Gemini',
    slug: 'xay-dung-ai-video-pipeline-assemblyai-gemini',
    shortDescription: 'Tự động hóa bóc tách audio sang transcript thời gian thực, sinh mindmap markdown và tạo câu hỏi tự động.',
    description: 'Làm chủ xử lý tác vụ nặng với RabbitMQ, AssemblyAI Speech-to-Text và Google Gemini Flash trong kiến trúc NestJS.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    trailerUrl: null,
    price: 399000,
    originalPrice: 799000,
    instructorId: 'inst-2',
    instructorName: 'Lê Hoàng Sơn',
    instructorTitle: 'AI System Engineer',
    instructorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
    status: CourseStatusEnum.PUBLISHED,
    level: CourseLevelEnum.ADVANCED,
    rating: 4.95,
    reviewCount: 219,
    studentCount: 1240,
    durationFormatted: '5h 40m',
    lessonsCount: 28,
    categorySlug: 'ai-data',
    categoryName: 'AI & Khoa học Dữ liệu',
    isFeatured: true,
    aiFeatures: {
      hasMindmap: true,
      hasInVideoQuiz: true,
      hasTranscript: true,
    },
    createdAt: '2026-02-18T09:30:00.000Z',
    updatedAt: '2026-02-22T14:10:00.000Z',
  },
  {
    id: 'course-uiux-systems',
    title: 'Thiết Kế Design System & Giao Diện Hiện Đại với Figma',
    slug: 'thiet-ke-design-system-giao-dien-figma',
    shortDescription: 'Phương pháp luận xây dựng bộ token màu sắc, typography, component library và handoff chuẩn kỹ thuật.',
    description: 'Học cách tư duy hệ thống giao diện, tối ưu visual hierarchy, loại bỏ chi tiết rườm rà và áp dụng nguyên tắc Anti-slop.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80',
    trailerUrl: null,
    price: 289000,
    originalPrice: 550000,
    instructorId: 'inst-3',
    instructorName: 'Nguyễn Thảo Nguyên',
    instructorTitle: 'Lead Product Designer',
    instructorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80',
    status: CourseStatusEnum.PUBLISHED,
    level: CourseLevelEnum.BEGINNER,
    rating: 4.88,
    reviewCount: 512,
    studentCount: 2650,
    durationFormatted: '3h 50m',
    lessonsCount: 24,
    categorySlug: 'thiet-ke',
    categoryName: 'Thiết kế UI/UX & Đồ họa',
    isFeatured: true,
    aiFeatures: {
      hasMindmap: true,
      hasInVideoQuiz: true,
      hasTranscript: true,
    },
    createdAt: '2026-02-10T11:00:00.000Z',
    updatedAt: '2026-02-16T16:20:00.000Z',
  },
  {
    id: 'course-nest-clean',
    title: 'NestJS Clean Architecture & Tích hợp RabbitMQ Monorepo',
    slug: 'nestjs-clean-architecture-rabbitmq-monorepo',
    shortDescription: 'Thiết kế REST API cấp doanh nghiệp với Repository Pattern, Base Abstract Audit và Message Broker bất đồng bộ.',
    description: 'Khóa học hướng dẫn chi tiết quy chuẩn kiến trúc NestJS, xử lý session MongoDB transaction và chống nghẽn dịch vụ.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
    trailerUrl: null,
    price: 359000,
    originalPrice: 650000,
    instructorId: 'inst-4',
    instructorName: 'Vũ Quốc Huy',
    instructorTitle: 'Principal Backend Engineer',
    instructorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
    status: CourseStatusEnum.PUBLISHED,
    level: CourseLevelEnum.INTERMEDIATE,
    rating: 4.92,
    reviewCount: 180,
    studentCount: 980,
    durationFormatted: '6h 10m',
    lessonsCount: 36,
    categorySlug: 'lap-trinh',
    categoryName: 'Lập trình & Kỹ thuật',
    isFeatured: false,
    aiFeatures: {
      hasMindmap: true,
      hasInVideoQuiz: true,
      hasTranscript: true,
    },
    createdAt: '2026-02-12T07:15:00.000Z',
    updatedAt: '2026-02-19T09:45:00.000Z',
  },
  {
    id: 'course-video-editing',
    title: 'Kỹ Thuật Dựng Video Giảng Dạy & Biên Tập Chuyên Nghiệp',
    slug: 'ky-thuat-dung-video-giang-day-chuyen-nghiep',
    shortDescription: 'Quy trình thu âm, xử lý lọc ồn micro, nhịp dựng khung hình và chuẩn hóa video cho hệ thống E-learning.',
    description: 'Nắm vững kỹ năng cắt dựng, nhịp ngắt câu giúp thuật toán AI chuyển ngữ âm thanh đạt độ chính xác 99%.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80',
    trailerUrl: null,
    price: 249000,
    originalPrice: 499000,
    instructorId: 'inst-5',
    instructorName: 'Phạm Đăng Khoa',
    instructorTitle: 'Media Producer & Lecturer',
    instructorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=120&q=80',
    status: CourseStatusEnum.PUBLISHED,
    level: CourseLevelEnum.BEGINNER,
    rating: 4.85,
    reviewCount: 145,
    studentCount: 1120,
    durationFormatted: '3h 10m',
    lessonsCount: 18,
    categorySlug: 'dung-video',
    categoryName: 'Dựng Video & Đa phương tiện',
    isFeatured: false,
    aiFeatures: {
      hasMindmap: true,
      hasInVideoQuiz: true,
      hasTranscript: true,
    },
    createdAt: '2026-02-14T13:20:00.000Z',
    updatedAt: '2026-02-21T11:00:00.000Z',
  },
  {
    id: 'course-prompt-engineering',
    title: 'Làm Chủ Prompt Engineering & AI Tự Động Hóa Tri Thức',
    slug: 'lam-chu-prompt-engineering-ai-tu-dong-hoa',
    shortDescription: 'Phương pháp cấu trúc prompt cho LLM để trích xuất sơ đồ tư duy phân cấp và bộ câu hỏi trắc nghiệm khách quan.',
    description: 'Học cách chỉ đạo mô hình ngôn ngữ lớn (Gemini, Claude, GPT) tạo ra nội dung chuẩn định dạng Markdown và JSON.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=800&q=80',
    trailerUrl: null,
    price: 299000,
    originalPrice: 590000,
    instructorId: 'inst-2',
    instructorName: 'Lê Hoàng Sơn',
    instructorTitle: 'AI System Engineer',
    instructorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
    status: CourseStatusEnum.PUBLISHED,
    level: CourseLevelEnum.BEGINNER,
    rating: 4.91,
    reviewCount: 290,
    studentCount: 2100,
    durationFormatted: '4h 05m',
    lessonsCount: 22,
    categorySlug: 'ai-data',
    categoryName: 'AI & Khoa học Dữ liệu',
    isFeatured: false,
    aiFeatures: {
      hasMindmap: true,
      hasInVideoQuiz: true,
      hasTranscript: true,
    },
    createdAt: '2026-02-16T15:40:00.000Z',
    updatedAt: '2026-02-22T08:30:00.000Z',
  },
];

export interface ILivePreviewBreakpoint {
  timestamp: string;
  seconds: number;
  label: string;
  mindmapActiveNode: string;
  mindmapBranch: string[];
  quiz?: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
}

export const LIVE_PREVIEW_MOCK_DATA = {
  courseTitle: 'Kiến trúc Next.js App Router Chuyên sâu',
  lessonTitle: 'Bài 03: Tối ưu Server Components & Phân cấp State',
  durationText: '04:15',
  breakpoints: [
    {
      timestamp: '00:45',
      seconds: 45,
      label: 'Kiến trúc Server First',
      mindmapActiveNode: 'RSC vs Client Component Boundary',
      mindmapBranch: ['Kiến trúc Next.js', 'React Server Components', 'RSC vs Client Component Boundary'],
    },
    {
      timestamp: '01:30',
      seconds: 90,
      label: 'Mốc kiểm tra In-video Quiz',
      mindmapActiveNode: 'Quy tắc Client Directive ("use client")',
      mindmapBranch: ['Kiến trúc Next.js', 'Client Boundary', 'Quy tắc Client Directive ("use client")'],
      quiz: {
        question: 'Khi nào BẮT BUỘC phải khai báo chỉ thị "use client" ở đầu tệp tin trong Next.js?',
        options: [
          'Khi component cần fetch dữ liệu trực tiếp từ cơ sở dữ liệu MongoDB',
          'Khi component sử dụng React hooks như useState, useEffect hoặc xử lý sự kiện onClick',
          'Khi render các thẻ HTML tĩnh như header, footer và thẻ p',
          'Tất cả mọi file trong thư mục app/ đều bắt buộc phải có "use client"',
        ],
        correctIndex: 1,
        explanation: 'Chính xác! Chỉ thị "use client" đánh dấu ranh giới chuyển đổi từ Server sang Client runtime, bắt buộc khi cần tương tác DOM, hooks hoặc state của trình duyệt.',
      },
    },
    {
      timestamp: '02:40',
      seconds: 160,
      label: 'Đồng bộ TanStack Query Server Cache',
      mindmapActiveNode: 'Hydration & QueryClient Provider',
      mindmapBranch: ['Kiến trúc Next.js', 'Quản lý State', 'Hydration & QueryClient Provider'],
    },
  ] as ILivePreviewBreakpoint[],
};
