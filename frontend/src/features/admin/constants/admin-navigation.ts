import type { AdminNavItem } from '../types';

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    title: 'Tổng quan',
    href: '/admin/dashboard',
    icon: 'lucide:layout-dashboard',
  },
  {
    title: 'Quản lý người dùng',
    href: '/admin/users',
    icon: 'lucide:users',
  },
  {
    title: 'Quản lý & Phê duyệt Khóa học',
    href: '/admin/courses',
    icon: 'lucide:book-open-check',
  },
  {
    title: 'Phê duyệt giảng viên',
    href: '/admin/instructors',
    icon: 'lucide:user-check',
  },
  {
    title: 'Quản Lý Doanh Thu & Hoa Hồng',
    href: '/admin/revenue',
    icon: 'lucide:receipt',
  },
  {
    title: 'Quản lý Danh mục & Phân loại',
    href: '/admin/categories',
    icon: 'lucide:folder-tree',
  },
  {
    title: 'Kiểm duyệt Đánh giá & Bình luận',
    href: '/admin/reviews',
    icon: 'lucide:message-square-check',
  },
];

/**
 * The dashboard only matches its exact route.
 * Every other tab also owns its nested detail routes.
 */
export function isAdminNavItemActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return href === '/admin/dashboard'
    ? normalized === href
    : normalized === href || normalized.startsWith(`${href}/`);
}
