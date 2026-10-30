export interface CourseCategorySeedItem {
  name: string;
  slug: string;
  description?: string;
  order: number;
  isActive: boolean;
  imageUrl?: string | null;
}

export const COURSE_CATEGORY_SEED_DATA: CourseCategorySeedItem[] = [
  {
    name: 'Công nghệ Thông tin & Lập trình',
    slug: 'lap-trinh',
    description: 'Lập trình web, mobile, backend, DevOps và các công nghệ phần mềm.',
    order: 0,
    isActive: true,
    imageUrl: null,
  },
  {
    name: 'AI & Khoa học Dữ liệu',
    slug: 'ai-data',
    description: 'Trí tuệ nhân tạo, học máy, phân tích dữ liệu và khoa học dữ liệu.',
    order: 1,
    isActive: true,
    imageUrl: null,
  },
  {
    name: 'Thiết kế UI/UX & Đồ họa',
    slug: 'thiet-ke',
    description: 'Thiết kế giao diện, trải nghiệm người dùng và đồ họa sáng tạo.',
    order: 2,
    isActive: true,
    imageUrl: null,
  },
  {
    name: 'Dựng Video & Đa phương tiện',
    slug: 'dung-video',
    description: 'Biên tập video, chuyển động, âm thanh và sản xuất nội dung số.',
    order: 3,
    isActive: true,
    imageUrl: null,
  },
  {
    name: 'Kinh doanh & Marketing số',
    slug: 'kinh-doanh',
    description: 'Quản trị kinh doanh, marketing, thương mại điện tử và bán hàng.',
    order: 4,
    isActive: true,
    imageUrl: null,
  },
  {
    name: 'Tài chính & Đầu tư',
    slug: 'tai-chinh-dau-tu',
    description: 'Tài chính cá nhân, đầu tư, chứng khoán và phân tích tài chính.',
    order: 5,
    isActive: true,
    imageUrl: null,
  },
  {
    name: 'Ngoại ngữ & Kỹ năng mềm',
    slug: 'ngoai-ngu-ky-nang',
    description: 'Ngoại ngữ, giao tiếp, thuyết trình và kỹ năng nghề nghiệp.',
    order: 6,
    isActive: true,
    imageUrl: null,
  },
];
