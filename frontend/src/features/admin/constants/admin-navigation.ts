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
    title: 'Quản lý Đơn hàng, Giao dịch & Doanh thu',
    href: '/admin/orders',
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
