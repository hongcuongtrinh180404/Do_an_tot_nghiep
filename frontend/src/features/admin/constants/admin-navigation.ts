import type { AdminNavItem } from '../types';

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    title: 'Tổng quan',
    href: '/admin',
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
    title: 'Quản lý Đơn hàng, Giao dịch & Doanh thu',
    href: '/admin/revenue',
    icon: 'lucide:receipt',
  },
  {
    title: 'Quản lý Danh mục & Phân loại',
    href: '/admin/categories',
    icon: 'lucide:folder-tree',
  },
  {
    title: 'Quản lý Khuyến mãi & Mã giảm giá',
    href: '/admin/promotions',
    icon: 'lucide:ticket-percent',
  },
  {
    title: 'Kiểm duyệt Đánh giá & Bình luận',
    href: '/admin/reviews',
    icon: 'lucide:message-square-check',
  },
  {
    title: 'Cấu hình Hệ thống',
    href: '/admin/settings',
    icon: 'lucide:settings-2',
  },
];

/**
 * The dashboard lives at the admin root, so it only matches exactly.
 * Every other tab also owns its nested detail routes.
 */
export function isAdminNavItemActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return href === '/admin'
    ? normalized === href
    : normalized === href || normalized.startsWith(`${href}/`);
}
