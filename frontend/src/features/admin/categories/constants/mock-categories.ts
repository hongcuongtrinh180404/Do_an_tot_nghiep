export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  courseCount: number;
  iconName: string;
  colorScheme: {
    bg: string;
    border: string;
    text: string;
  };
  imageUrl?: string;
}

export const MOCK_CATEGORIES: CategoryItem[] = [
  {
    id: 'cat-01',
    name: 'Công nghệ Thông tin & Dữ liệu',
    slug: '/cong-nghe-thong-tin',
    courseCount: 340,
    iconName: 'lucide:code-xml',
    colorScheme: {
      bg: 'bg-sky-50 dark:bg-sky-500/10',
      border: 'border-sky-200/80 dark:border-sky-500/20',
      text: 'text-sky-600 dark:text-sky-400',
    },
  },
  {
    id: 'cat-02',
    name: 'Kinh doanh & Marketing',
    slug: '/kinh-doanh-marketing',
    courseCount: 520,
    iconName: 'lucide:megaphone',
    colorScheme: {
      bg: 'bg-pink-50 dark:bg-pink-500/10',
      border: 'border-pink-200/80 dark:border-pink-500/20',
      text: 'text-pink-600 dark:text-pink-400',
    },
  },
  {
    id: 'cat-03',
    name: 'Tài chính & Đầu tư',
    slug: '/tai-chinh-dau-tu',
    courseCount: 148,
    iconName: 'lucide:trending-up',
    colorScheme: {
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      border: 'border-emerald-200/80 dark:border-emerald-500/20',
      text: 'text-emerald-600 dark:text-emerald-400',
    },
  },
  {
    id: 'cat-04',
    name: 'Thiết kế Đồ họa & UI/UX',
    slug: '/thiet-ke-do-hoa',
    courseCount: 177,
    iconName: 'lucide:palette',
    colorScheme: {
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      border: 'border-amber-200/80 dark:border-amber-500/20',
      text: 'text-amber-600 dark:text-amber-400',
    },
  },
  {
    id: 'cat-05',
    name: 'Ngoại ngữ & Kỹ năng mềm',
    slug: '/ngoai-ngu-ky-nang',
    courseCount: 215,
    iconName: 'lucide:languages',
    colorScheme: {
      bg: 'bg-teal-50 dark:bg-teal-500/10',
      border: 'border-teal-200/80 dark:border-teal-500/20',
      text: 'text-teal-600 dark:text-teal-400',
    },
  },
];
